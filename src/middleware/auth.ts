import {Request, Response, NextFunction} from 'express';
import jwt from 'jsonwebtoken';

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
        res.status(401).json({error: 'Access token required'});
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {id: string};
        req.user = {id: decoded.id};
        next();
    } catch {
        res.status(406).json({error: 'Invalid token'});
    }
}
