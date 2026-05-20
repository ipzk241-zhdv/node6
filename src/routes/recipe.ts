import { Router, Request, Response, NextFunction } from "express";
import { validate } from "../middleware/validate";
import { createRecipeSchema, updateRecipeSchema } from "../schemas/recipe.schema";
import {
    getAllRecipes,
    getRecipeById,
    createRecipe,
    updateRecipe,
    deleteRecipe,
    getRandomRecipe,
    getRecipesByIngredient,
    RecipeFilters,
} from "../storage/recipe";
import { requireAuth } from "../middleware/requireAuth";

const router = Router();

// Маршрут для випадкового рецепту (має бути перед /:id, щоб 'random' не сприймалось як ID)
router.get("/random", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recipe = await getRandomRecipe();
        if (!recipe) {
            return res.status(404).json({ message: "Рецептів поки немає" });
        }
        res.status(200).json(recipe);
    } catch (error) {
        next(error);
    }
});

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const filters: RecipeFilters = {};

        if (req.query.title) filters.title = req.query.title as string;
        if (req.query.difficulty) filters.difficulty = req.query.difficulty as string;
        if (req.query.maxTime) filters.maxTime = parseInt(req.query.maxTime as string, 10);

        const sort = (req.query.sort as string) || "-createdAt";
        const page = parseInt(req.query.page as string, 10) || 1;
        const limit = parseInt(req.query.limit as string, 10) || 10;

        const result = await getAllRecipes(filters, sort, page, limit);
        res.status(200).json(result);
    } catch (error) {
        next(error);
    }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recipe = await getRecipeById(req.params.id as string);
        if (!recipe) {
            return res.status(404).json({ message: "Рецепт не знайдено" });
        }
        res.status(200).json(recipe);
    } catch (error) {
        next(error);
    }
});

router.post("/", requireAuth, validate(createRecipeSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recipeData = { ...req.body, ownerId: req.userId };
        const newRecipe = await createRecipe(recipeData);
        res.status(201).json(newRecipe);
    } catch (error) {
        next(error);
    }
});

router.put(
    "/:id",
    requireAuth,
    validate(updateRecipeSchema),
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const recipe = await getRecipeById(req.params.id as string);
            if (!recipe) {
                res.status(404).json({ message: "Рецепт не знайдено" });
                return;
            }

            if (recipe.ownerId.toString() !== req.userId) {
                res.status(403).json({ message: "Forbidden" });
                return;
            }

            const updatedRecipe = await updateRecipe(req.params.id as string, req.body);
            res.status(200).json(updatedRecipe);
        } catch (error) {
            next(error);
        }
    },
);

router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const recipe = await getRecipeById(req.params.id as string);
        if (!recipe) {
            res.status(404).json({ message: "Рецепт не знайдено" });
            return;
        }

        if (recipe.ownerId.toString() !== req.userId) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }

        await deleteRecipe(req.params.id as string);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
});

router.get("/ingredient/:ingredient", async (req: Request, res: Response, next: NextFunction) => {
    try {
        const recipes = await getRecipesByIngredient(req.params.ingredient as string);
        res.status(200).json(recipes);
    } catch (error) {
        next(error);
    }
});

export default router;
