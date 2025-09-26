import {Router} from 'express';
import bcrypt from 'bcrypt';
import db from '../lib/db';
import {v4 as uuid} from 'uuid';
import {AppRequest, AppResponse} from '../types/http';
import {loginLimiter} from '../lib/rateLimit';
import {generateAccessToken, generateRefreshToken} from '../lib/tokens';
import z from 'zod';
import {AccessTokenSchema, LoginResponceSchema, LoginSchema, RegisterSchema} from '../schemas';

const router = Router();

router.post(
    '/register',
    async (req: AppRequest<z.infer<typeof RegisterSchema>>, res: AppResponse) => {
        console.log('POST /auth/register');
        const validation = RegisterSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({error: validation.error.errors[0].message});
            return;
        }
        const {email, username, password} = validation.data;
        const existingEmail = await db.user.findUnique({where: {email}});
        if (existingEmail) {
            res.status(400).json({error: 'This email is already in use. Consider sign in'});
            return;
        }
        const hash = await bcrypt.hash(password, 10);
        try {
            await db.user.create({
                data: {
                    id: uuid(),
                    email,
                    username,
                    password: hash,
                },
            });
        } catch (error) {
            console.error('Error creating user:', error);
            res.status(500).json({error: 'Internal server error'});
            return;
        }
        res.status(201).json('User registered please sign in');
    },
);
router.post(
    '/login',
    loginLimiter,
    async (req: AppRequest<z.infer<typeof LoginSchema>>, res: AppResponse) => {
        console.log('POST /auth/login');
        const validation = LoginSchema.safeParse(req.body);
        if (!validation.success) {
            res.status(400).json({error: validation.error.errors[0].message});
            return;
        }
        const {email, password} = validation.data;
        const user = await db.user.findUnique({
            where: {email},
        });
        console.log('user', user);
        if (!user) {
            res.status(404).json({error: 'User not found'});
            return;
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            res.status(401).json({error: 'Password is incorrect'});
            return;
        }
        const accessToken = generateAccessToken(user.id);
        const refreshToken = generateRefreshToken();
        const expires = new Date();
        expires.setDate(expires.getDate() + 7);

        await db.refreshToken.create({
            data: {
                token: refreshToken,
                userId: user.id,
                expiresAt: expires,
            },
        });
        res.cookie('refreshToken', refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            expires,
        });

        const responce = LoginResponceSchema.parse({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
            accessToken,
        });
        res.status(200).json(responce);
    },
);

router.post('/logout', async (req: AppRequest, res: AppResponse) => {
    console.log('POST /auth/logout');
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
        res.status(400).json({error: 'No refresh token provided'});
        return;
    }
    try {
        await db.refreshToken.delete({where: {token: refreshToken}});
    } catch (error) {
        console.error('Error deleting refresh token:', error);
        res.status(500).json({error: 'Internal server error'});
        return;
    }
    res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
    });
    res.status(200).json({message: 'Logged out successfully'});
});

router.post(
    '/refresh',
    async (req: AppRequest<z.infer<typeof AccessTokenSchema>>, res: AppResponse) => {
        console.log('POST /auth/refresh');
        const oldToken = req.cookies.refreshToken;
        console.log('coming to refresh token');
        if (!oldToken) {
            res.status(401).json({error: 'No refresh token provided'});
            return;
        }

        const storedToken = await db.refreshToken.findUnique({
            where: {token: oldToken},
            include: {user: true},
        });

        if (!storedToken) {
            res.status(404).json({error: 'Refresh token not found'});
        }
        if (!storedToken || storedToken.expiresAt < new Date()) {
            res.status(403).json({error: 'Refresh token is invalid or expired'});
            return;
        }

        const newAccessToken = generateAccessToken(storedToken.user.id);
        const newRefreshToken = generateRefreshToken();
        const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        await db.refreshToken.delete({where: {token: oldToken}});
        await db.refreshToken.create({
            data: {
                token: newRefreshToken,
                userId: storedToken.user.id,
                expiresAt: newExpiresAt,
            },
        });
        console.log('Sending refresh token to client');
        res.cookie('refreshToken', newRefreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            expires: newExpiresAt,
        });

        res.status(200).json(AccessTokenSchema.parse(newAccessToken));
    },
);


export default router;
