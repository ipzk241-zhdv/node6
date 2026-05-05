import dotenv from 'dotenv';
import express, { Request, Response } from 'express';
dotenv.config();

import mongoose from 'mongoose';
import app from './app';
import { connectDB } from './config/database';

const PORT = Number(process.env.PORT) || 3000;

app.get('/health', (req: Request, res: Response) => {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const isDbConnected = mongoose.connection.readyState === 1;

    навмисна помилка

    if (isDbConnected) {
        res.status(200).json({
            status: 'ok',
            database: 'connected',
            timestamp: new Date().toISOString()
        });
    } else {
        res.status(503).json({
            status: 'error',
            database: 'disconnected',
            timestamp: new Date().toISOString()
        });
    }
});

const startServer = async () => {
    await connectDB();

    const server = app.listen(PORT, "0.0.0.0", () => {
        console.log(`Сервер запущено на порту ${PORT}`);
    });

    const gracefulShutdown = async (signal: string) => {
        console.log(`\nЗакриття серверу після ${signal}`);
        
        server.close(async (err) => {
            if (err) {
                console.error('Помилка при закритті сервера:', err);
                process.exit(1);
            }
            console.log('HTTP сервер закрито');
            
            try {
                await mongoose.connection.close();
                console.log('З\'єднання з MongoDB закрито');
                process.exit(0);
            } catch (mongoErr) {
                console.error('Помилка при закритті з\'єднання з MongoDB:', mongoErr);
                process.exit(1);
            }
        });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

startServer();