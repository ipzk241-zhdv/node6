"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateRecipeSchema = exports.createRecipeSchema = void 0;
const zod_1 = require("zod");
exports.createRecipeSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, "Назва обовʼязкова")
        .max(100, "Назва не може перевищувати 100 символів"),
    description: zod_1.z
        .string()
        .max(500, "Опис не може перевищувати 500 символів")
        .optional(),
    difficulty: zod_1.z.enum(["easy", "medium", "hard"], {
        message: "Складність має бути: easy, medium або hard",
    }),
    cookingTimeMinutes: zod_1.z
        .number({ message: "Час приготування має бути числом" })
        .int("Час приготування має бути цілим числом")
        .positive("Час приготування має бути більшим за нуль"),
    ingredients: zod_1.z
        .array(zod_1.z
        .string()
        .min(1, "Рядок інгредієнта не може бути порожнім")
        .max(100, "Назва інгрідієнту не може перевищувати 100 символів"))
        .min(1, "Рецепт має містити хоча б один інгредієнт"),
});
exports.updateRecipeSchema = exports.createRecipeSchema.partial();
