"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Recipe = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const uuid_1 = require("uuid");
const recipeSchema = new mongoose_1.Schema({
    id: {
        type: String,
        default: () => (0, uuid_1.v4)(),
        unique: true,
        required: [true, 'Поле id є обовʼязковим']
    },
    title: {
        type: String,
        required: [true, 'Назва обовʼязкова'],
        minlength: [1, 'Назва не може бути порожньою'],
        maxlength: [100, 'Назва не може перевищувати 100 символів'],
        trim: true
    },
    description: {
        type: String,
        maxlength: [500, 'Опис не може перевищувати 500 символів'],
        trim: true
    },
    difficulty: {
        type: String,
        required: [true, 'Складність є обовʼязковою'],
        enum: {
            values: ['easy', 'medium', 'hard'],
            message: 'Складність має бути: easy, medium або hard'
        }
    },
    cookingTimeMinutes: {
        type: Number,
        required: [true, 'Час приготування є обовʼязковим'],
        min: [1, 'Час приготування має бути більшим за нуль'],
        validate: {
            // перевірка на ціле число
            validator: Number.isInteger,
            message: 'Час приготування має бути цілим числом'
        }
    },
    ingredients: {
        type: [String],
        required: [true, 'Масив інгредієнтів є обовʼязковим'],
        validate: [
            {
                // масив не має бути порожнім
                validator: function (val) {
                    return val.length > 0;
                },
                message: 'Рецепт має містити хоча б один інгредієнт'
            },
            {
                // перевірка довжини кожного рядка інгредієнта
                validator: function (val) {
                    return val.every(item => item.length >= 1 && item.length <= 100);
                },
                message: 'Назва кожного інгредієнту має бути від 1 до 100 символів'
            }
        ]
    }
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: function (_, ret) {
            delete ret._id;
            delete ret.__v;
            return ret;
        }
    },
    toObject: { virtuals: true }
});
// Чи готується рецепт швидко? (<= 30 хв)
recipeSchema.virtual('isQuickRecipe').get(function () {
    return this.cookingTimeMinutes <= 30;
});
// Зручний формат часу ("1 год 20 хв" або "30 хв")
recipeSchema.virtual('formattedCookingTime').get(function () {
    const hours = Math.floor(this.cookingTimeMinutes / 60);
    const minutes = this.cookingTimeMinutes % 60;
    if (hours > 0) {
        return `${hours} год ${minutes > 0 ? minutes + ' хв' : ''}`.trim();
    }
    return `${minutes} хв`;
});
exports.Recipe = mongoose_1.default.model('Recipe', recipeSchema);
