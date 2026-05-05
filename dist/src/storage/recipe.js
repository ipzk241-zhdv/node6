"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomRecipe = exports.getRecipesByIngredient = exports.deleteRecipe = exports.updateRecipe = exports.createRecipe = exports.getRecipeById = exports.getAllRecipes = void 0;
const recipe_model_1 = require("../models/recipe.model");
const getAllRecipes = async (filters, sortQuery = '-createdAt', // За замовчуванням: найновіші перші
page = 1, limit = 10) => {
    const query = {};
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
        recipe_model_1.Recipe.find(query)
            .sort(sortField)
            .skip(skip)
            .limit(limit),
        recipe_model_1.Recipe.countDocuments(query)
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
exports.getAllRecipes = getAllRecipes;
const getRecipeById = async (id) => {
    return await recipe_model_1.Recipe.findOne({ id });
};
exports.getRecipeById = getRecipeById;
const createRecipe = async (data) => {
    const newRecipe = new recipe_model_1.Recipe(data);
    return await newRecipe.save();
};
exports.createRecipe = createRecipe;
const updateRecipe = async (id, data) => {
    return await recipe_model_1.Recipe.findOneAndUpdate({ id }, data, { new: true, runValidators: true });
};
exports.updateRecipe = updateRecipe;
const deleteRecipe = async (id) => {
    const deletedRecipe = await recipe_model_1.Recipe.findOneAndDelete({ id });
    return deletedRecipe !== null;
};
exports.deleteRecipe = deleteRecipe;
const getRecipesByIngredient = async (ingredient) => {
    return await recipe_model_1.Recipe.find({
        ingredients: { $regex: ingredient, $options: 'i' }
    });
};
exports.getRecipesByIngredient = getRecipesByIngredient;
const getRandomRecipe = async () => {
    const randomRecipes = await recipe_model_1.Recipe.aggregate([{ $sample: { size: 1 } }]);
    return randomRecipes.length > 0 ? randomRecipes[0] : null;
};
exports.getRandomRecipe = getRandomRecipe;
