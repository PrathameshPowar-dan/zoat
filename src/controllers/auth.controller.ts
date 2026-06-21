import { type Request, type Response } from 'express';
import admin from '../config/firebase.js'; // Import your initialized admin
import prisma from '../utils/prisma.js';
import jwt from 'jsonwebtoken';

export const verifyFirebaseAndLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        const { idToken } = req.body;
        
        if (!idToken) {
            res.status(400).json({ status: 'error', message: 'ID token is required' });
            return;
        }

        // Verify token with Firebase
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, phone_number, email, name } = decodedToken;

        // Find or create the user in PostgreSQL
        let user = await prisma.user.findUnique({
            where: { firebaseUid: uid }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    firebaseUid: uid,
                    phone: phone_number || null,
                    email: email || null,
                    name: name || 'Zoat User', // Can be updated by user later
                }
            });
        }

        // Generate Custom JWT for session management
        const customJwt = jwt.sign(
            { id: user.id, role: user.role },
            process.env.JWT_SECRET as string,
            { expiresIn: '7d' } // 7-day session
        );

        res.status(200).json({
            status: 'success',
            token: customJwt,
            user
        });
    } catch (error) {
        console.error('Firebase verification error:', error);
        res.status(401).json({ status: 'error', message: 'Invalid authentication token' });
    }
};