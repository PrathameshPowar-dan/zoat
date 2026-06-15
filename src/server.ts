import express, { type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import prisma from './utils/prisma.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security and Parsing Middleware
app.use(helmet());
app.use(cors());
app.use(express.json()); // Parses incoming JSON payloads

// Health Check & DB Test Route
app.get('/api/health', async (req: Request, res: Response) => {
    try {
        // A lightweight query to verify database connectivity
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