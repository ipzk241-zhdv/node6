"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const connectDB = async () => {
    try {
        const mongoURI = process.env.MONGODB_URI;
        if (!mongoURI) {
            throw new Error('Змінна середовища MONGODB_URI не визначена');
        }
        await mongoose_1.default.connect(mongoURI);
        console.log('Успішно підключено до MongoDB');
        mongoose_1.default.connection.on('error', (err) => {
            console.error('Помилка з\'єднання з MongoDB:', err);
        });
        mongoose_1.default.connection.on('disconnected', () => {
            console.warn('Відключено від MongoDB');
        });
    }
    catch (error) {
        console.error('Не вдалося підключитися до MongoDB:', error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
