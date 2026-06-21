import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './utils/prisma.js';
import restaurantRoutes from './routes/restaurant/restaurant.routes.js';
import authRoutes from './routes/auth/auth.routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Attach the routes to the app
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);

app.get('/api/health', async (req: Request, res: Response) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.status(200).json({
            status: 'success',
            message: 'Backend is running natively. Database connected securely.'
        });
    } catch (error) {
        console.error('Database connection failed:', error);
        res.status(500).json({
            status: 'error',
            message: 'Database connection failed.'
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server initialized on http://localhost:${PORT}`);
});