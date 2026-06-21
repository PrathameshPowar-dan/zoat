import { type Request, type Response, type NextFunction } from 'express';import jwt from 'jsonwebtoken';

// Extend Express Request to include our custom user payload
export interface AuthRequest extends Request {
    user?: any;
}

export const protectRoute = (req: AuthRequest, res: Response, next: NextFunction): void => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        res.status(401).json({ status: 'error', message: 'Access denied. No token provided.' });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string);
        req.user = decoded; // Attach user info to the request
        next();
    } catch (error) {
        res.status(403).json({ status: 'error', message: 'Invalid or expired token' });
    }
};