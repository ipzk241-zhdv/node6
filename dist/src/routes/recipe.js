"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const validate_1 = require("../middleware/validate");
const recipe_schema_1 = require("../schemas/recipe.schema");
const recipe_1 = require("../storage/recipe");
const router = (0, express_1.Router)();
// Маршрут для випадкового рецепту (має бути перед /:id, щоб 'random' не сприймалось як ID)
router.get('/random', async (req, res, next) => {
    try {
        const recipe = await (0, recipe_1.getRandomRecipe)();
        if (!recipe) {
            return res.status(404).json({ message: 'Рецептів поки немає' });
        }
        res.status(200).json(recipe);
    }
    catch (error) {
        next(error);
    }
});
router.get('/', async (req, res, next) => {
    try {
        const filters = {};
        if (req.query.title)
            filters.title = req.query.title;
        if (req.query.difficulty)
            filters.difficulty = req.query.difficulty;
        if (req.query.maxTime)
            filters.maxTime = parseInt(req.query.maxTime, 10);
        const sort = req.query.sort || '-createdAt';
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const result = await (0, recipe_1.getAllRecipes)(filters, sort, page, limit);
        res.status(200).json(result);
    }
    catch (error) {
        next(error);
    }
});
router.get('/:id', async (req, res, next) => {
    try {
        const recipe = await (0, recipe_1.getRecipeById)(req.params.id);
        if (!recipe) {
            return res.status(404).json({ message: 'Рецепт не знайдено' });
        }
        res.status(200).json(recipe);
    }
    catch (error) {
        next(error);
    }
});
router.post('/', (0, validate_1.validate)(recipe_schema_1.createRecipeSchema), async (req, res, next) => {
    try {
        const newRecipe = await (0, recipe_1.createRecipe)(req.body);
        res.status(201).json(newRecipe);
    }
    catch (error) {
        next(error);
    }
});
router.put('/:id', (0, validate_1.validate)(recipe_schema_1.updateRecipeSchema), async (req, res, next) => {
    try {
        const updatedRecipe = await (0, recipe_1.updateRecipe)(req.params.id, req.body);
        if (!updatedRecipe) {
            return res.status(404).json({ message: 'Рецепт не знайдено' });
        }
        res.status(200).json(updatedRecipe);
    }
    catch (error) {
        next(error);
    }
});
router.delete('/:id', async (req, res, next) => {
    try {
        const isDeleted = await (0, recipe_1.deleteRecipe)(req.params.id);
        if (!isDeleted) {
            return res.status(404).json({ message: 'Рецепт не знайдено' });
        }
        res.status(204).send();
    }
    catch (error) {
        next(error);
    }
});
router.get('/ingredient/:ingredient', async (req, res, next) => {
    try {
        const recipes = await (0, recipe_1.getRecipesByIngredient)(req.params.ingredient);
        res.status(200).json(recipes);
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
