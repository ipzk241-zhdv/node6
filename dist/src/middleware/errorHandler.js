"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const errorHandler = (err, req, res, next) => {
    console.error('Помилка сервера:', err);
    if (err.name === 'ZodError') {
        return res.status(400).json({
            message: 'Помилка валідації даних (Zod)',
            errors: err.errors
        });
    }
    if (err instanceof mongoose_1.default.Error.ValidationError) {
        const errors = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({
            message: 'Помилка валідації БД (Mongoose)',
            errors
        });
    }
    if (err instanceof mongoose_1.default.Error.CastError) {
        return res.status(400).json({
            message: `Невалідний формат даних для поля ${err.path}`,
            value: err.value
        });
    }
    if (err.name === 'MongoServerError' && err.code === 11000) {
        return res.status(409).json({
            message: 'Запис з такими даними вже існує (Конфлікт дублікатів)'
        });
    }
    res.status(500).json({
        message: 'Внутрішня помилка сервера',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
exports.errorHandler = errorHandler;
