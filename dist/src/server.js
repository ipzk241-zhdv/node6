"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const mongoose_1 = __importDefault(require("mongoose"));
const app_1 = __importDefault(require("./app"));
const database_1 = require("./config/database");
const PORT = process.env.PORT || 3000;
const startServer = async () => {
    await (0, database_1.connectDB)();
    const server = app_1.default.listen(PORT, () => {
        console.log(`Сервер запущено на порту ${PORT}`);
    });
    const gracefulShutdown = async (signal) => {
        console.log(`\nЗакриття серверу після ${signal}`);
        server.close(async (err) => {
            if (err) {
                console.error('Помилка при закритті сервера:', err);
                process.exit(1);
            }
            console.log('HTTP сервер закрито');
            try {
                await mongoose_1.default.connection.close();
                console.log('З\'єднання з MongoDB закрито');
                process.exit(0);
            }
            catch (mongoErr) {
                console.error('Помилка при закритті з\'єднання з MongoDB:', mongoErr);
                process.exit(1);
            }
        });
    };
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};
startServer();
