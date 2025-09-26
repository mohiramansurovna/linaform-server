import rateLimit from 'express-rate-limit';

export const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    //BBUILD: change to 5
    limit: 500,//max 5 limit per IP
    statusCode:429,
    message: {error: 'Too many login attempts. Please try again later.'},
    standardHeaders: true,
    legacyHeaders: false,
});
