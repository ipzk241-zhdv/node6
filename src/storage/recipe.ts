import { Recipe, IRecipeDocument } from '../models/recipe.model';
import { z } from 'zod';
import { createRecipeSchema, updateRecipeSchema } from '../schemas/recipe.schema';

type CreateRecipeDTO = z.infer<typeof createRecipeSchema>;
type UpdateRecipeDTO = z.infer<typeof updateRecipeSchema>;

export interface RecipeFilters {
    title?: string;
    difficulty?: string;
    maxTime?: number;
}

export const getAllRecipes = async (
    filters: RecipeFilters,
    sortQuery: string = '-createdAt', // За замовчуванням: найновіші перші
    page: number = 1,
    limit: number = 10
) => {
    const query: any = {};

    if (filters.title) {
        query.title = { $regex: filters.title, $options: 'i' };
    }

    if (filters.difficulty) {
        query.difficulty = filters.difficulty;
    }

    if (filters.maxTime) {
        query.cookingTimeMinutes = { $lte: filters.maxTime };
    }

    const sortField = sortQuery.split(',').join(' ');

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
        Recipe.find(query)
            .sort(sortField)
            .skip(skip)
            .limit(limit),
        Recipe.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages
        }
    };
};

export const getRecipeById = async (id: string): Promise<IRecipeDocument | null> => {
    return await Recipe.findOne({ id });
};

export const createRecipe = async (data: CreateRecipeDTO): Promise<IRecipeDocument> => {
    const newRecipe = new Recipe(data);
    return await newRecipe.save();
};

export const updateRecipe = async (id: string, data: UpdateRecipeDTO): Promise<IRecipeDocument | null> => {
    return await Recipe.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};

export const deleteRecipe = async (id: string): Promise<boolean> => {
    const deletedRecipe = await Recipe.findOneAndDelete({ id });
    return deletedRecipe !== null;
};

export const getRecipesByIngredient = async (ingredient: string): Promise<IRecipeDocument[]> => {
    return await Recipe.find({
        ingredients: { $regex: ingredient, $options: 'i' }
    });
};

export const getRandomRecipe = async (): Promise<IRecipeDocument | null> => {
    const randomRecipes = await Recipe.aggregate([{ $sample: { size: 1 } }]);
    return randomRecipes.length > 0 ? randomRecipes[0] : null;
};