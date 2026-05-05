import { z } from "zod";

export const createRecipeSchema = z.object({
    title: z
        .string()
        .min(1, "Назва обовʼязкова")
        .max(100, "Назва не може перевищувати 100 символів"),

    description: z
        .string()
        .max(500, "Опис не може перевищувати 500 символів")
        .optional(),

    difficulty: z.enum(["easy", "medium", "hard"], {
        message: "Складність має бути: easy, medium або hard",
    }),

    cookingTimeMinutes: z
        .number({ message: "Час приготування має бути числом" })
        .int("Час приготування має бути цілим числом")
        .positive("Час приготування має бути більшим за нуль"),

    ingredients: z
        .array(
            z
                .string()
                .min(1, "Рядок інгредієнта не може бути порожнім")
                .max(
                    100,
                    "Назва інгрідієнту не може перевищувати 100 символів",
                ),
        )
        .min(1, "Рецепт має містити хоча б один інгредієнт"),
});

export const updateRecipeSchema = createRecipeSchema.partial();

export type Recipe = z.infer<typeof createRecipeSchema> & {
    id: string;
    createdAt: Date;
    updatedAt: Date;
};
