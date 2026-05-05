import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export interface IRecipe {
    id: string;     // поле id ще було передбачено в 3 лабі, тому залишаю як є
    title: string;
    description?: string;
    difficulty: 'easy' | 'medium' | 'hard';
    cookingTimeMinutes: number;
    ingredients: string[];
}

// Додатковий інтерфейс, який поєднує нашу сутність та Mongoose Document
// Тут ми також описуємо віртуальні властивості та дати
export interface IRecipeDocument extends IRecipe, Document {
    isQuickRecipe: boolean;       // Віртуальне поле
    formattedCookingTime: string; // Віртуальне поле
    createdAt: Date;
    updatedAt: Date;
}

const recipeSchema = new Schema<IRecipeDocument>(
    {
        id: {
            type: String,
            default: () => uuidv4(),
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
                    validator: function (val: string[]) {
                        return val.length > 0;
                    },
                    message: 'Рецепт має містити хоча б один інгредієнт'
                },
                {
                    // перевірка довжини кожного рядка інгредієнта
                    validator: function (val: string[]) {
                        return val.every(item => item.length >= 1 && item.length <= 100);
                    },
                    message: 'Назва кожного інгредієнту має бути від 1 до 100 символів'
                }
            ]
        }
    },
    {
        timestamps: true,
        toJSON: {
            virtuals: true,
            transform: function (_, ret: any) {
                delete ret._id;
                delete ret.__v;
                return ret;
            }
        },
        toObject: { virtuals: true }
    }
);


// Чи готується рецепт швидко? (<= 30 хв)
recipeSchema.virtual('isQuickRecipe').get(function (this: IRecipeDocument) {
    return this.cookingTimeMinutes <= 30;
});

// Зручний формат часу ("1 год 20 хв" або "30 хв")
recipeSchema.virtual('formattedCookingTime').get(function (this: IRecipeDocument) {
    const hours = Math.floor(this.cookingTimeMinutes / 60);
    const minutes = this.cookingTimeMinutes % 60;

    if (hours > 0) {
        return `${hours} год ${minutes > 0 ? minutes + ' хв' : ''}`.trim();
    }
    return `${minutes} хв`;
});

export const Recipe = mongoose.model<IRecipeDocument>('Recipe', recipeSchema);