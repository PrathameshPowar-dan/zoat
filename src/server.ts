import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './utils/prisma.js';

import authRoutes from './routes/auth/auth.routes.js';
import restaurantRoutes from './routes/restaurant/restaurant.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());

// Explicit CORS Configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);

app.get('/api/health', async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({ status: 'success', message: 'Backend is running on Vercel.' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Database connection failed.' });
    }
});

// Start the server ONLY if we are running locally
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server initialized on http://localhost:${PORT}`);
    });
}

export default app;