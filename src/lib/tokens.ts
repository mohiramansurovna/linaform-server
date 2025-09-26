import jwt from 'jsonwebtoken';
import {v4 as uuid} from 'uuid';

export function generateAccessToken(userId: string) {
    return jwt.sign({id: userId}, process.env.JWT_SECRET!, {expiresIn: '15m'});
}

export function generateRefreshToken() {
    return uuid();
}
