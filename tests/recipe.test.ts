import request from "supertest";
import app from "../src/app";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { Recipe } from "../src/models/recipe.model";
import { User } from "../src/models/user.model";
import { connectDBForTesting, disconnectDBForTesting, clearDBForTesting } from "./setup";
import { errorHandler } from "../src/middleware/errorHandler";

const JWT_SECRET = process.env.JWT_SECRET || "jwt_key";

let testUserId: string;
let testToken: string;
let anotherUserId: string;
let anotherToken: string;

beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;
    await connectDBForTesting();

    const user = await User.create({ email: "test@example.com", password: "password123" });
    testUserId = user._id.toString();
    testToken = jwt.sign({ userId: testUserId }, JWT_SECRET, { expiresIn: "15m" });

    const anotherUser = await User.create({ email: "other@example.com", password: "password123" });
    anotherUserId = anotherUser._id.toString();
    anotherToken = jwt.sign({ userId: anotherUserId }, JWT_SECRET, { expiresIn: "15m" });
});

afterEach(async () => {
    await clearDBForTesting();
    await User.create({ _id: testUserId, email: "test@example.com", password: "password123" });
    await User.create({ _id: anotherUserId, email: "other@example.com", password: "password123" });
});

afterAll(async () => {
    await disconnectDBForTesting();
});

describe("Unit-тести Recipe", () => {
    it("Повинна успішно створювати документ із правильними дефолтами та віртуальними полями", async () => {
        const recipeData = {
            title: "Тестовий рецепт",
            difficulty: "easy",
            cookingTimeMinutes: 25,
            ingredients: ["Інгредієнт 1"],
            ownerId: testUserId,
        };

        const recipe = new Recipe(recipeData);
        await recipe.save();

        expect(recipe.id).toBeDefined();
        expect(recipe.createdAt).toBeDefined();
        expect(recipe.updatedAt).toBeDefined();

        expect(recipe.isQuickRecipe).toBe(true);
        expect(recipe.formattedCookingTime).toBe("25 хв");
    });

    it("Повинна викидати помилку при невалідних даних (кастомні валідатори Mongoose)", async () => {
        const invalidRecipe = new Recipe({
            title: "",
            difficulty: "super-hard",
            cookingTimeMinutes: -5,
            ingredients: [],
        });

        let err: any;
        try {
            await invalidRecipe.save();
        } catch (error) {
            err = error;
        }

        expect(err).toBeInstanceOf(mongoose.Error.ValidationError);
        expect(err.errors.title).toBeDefined();
        expect(err.errors.difficulty).toBeDefined();
        expect(err.errors.cookingTimeMinutes).toBeDefined();
        expect(err.errors.ingredients).toBeDefined();
        expect(err.errors.ownerId).toBeDefined();
    });

    it("Повинна коректно форматувати час (години та хвилини)", () => {
        const recipe = new Recipe({
            title: "Борщ",
            difficulty: "medium",
            cookingTimeMinutes: 75,
            ingredients: ["Буряк"],
            ownerId: testUserId,
        });
        expect(recipe.formattedCookingTime).toBe("1 год 15 хв");

        const recipeExactHour = new Recipe({
            title: "Каша",
            difficulty: "easy",
            cookingTimeMinutes: 60,
            ingredients: ["Крупа"],
            ownerId: testUserId,
        });
        expect(recipeExactHour.formattedCookingTime).toBe("1 год");
    });
});

describe("Інтеграційні тести API Recipe", () => {
    describe("POST /api/recipes", () => {
        it("Повинен створити новий рецепт та повернути статус 201", async () => {
            const res = await request(app)
                .post("/api/recipes")
                .set("Cookie", [`access_token=${testToken}`])
                .send({
                    title: "Млинці",
                    difficulty: "easy",
                    cookingTimeMinutes: 20,
                    ingredients: ["Молоко", "Яйця"],
                });

            expect(res.status).toBe(201);
            expect(res.body.title).toBe("Млинці");
            expect(res.body.id).toBeDefined();
            expect(res.body.ownerId).toBe(testUserId);
        });

        it("Повинен повернути 400 при помилці валідації Zod (немає назви)", async () => {
            const res = await request(app)
                .post("/api/recipes")
                .set("Cookie", [`access_token=${testToken}`])
                .send({
                    difficulty: "easy",
                    cookingTimeMinutes: 20,
                    ingredients: ["Молоко"],
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toContain("Zod");
        });

        it("Повинен повернути 401, якщо запит без токена", async () => {
            const res = await request(app)
                .post("/api/recipes")
                .send({
                    title: "Млинці",
                    difficulty: "easy",
                    cookingTimeMinutes: 20,
                    ingredients: ["Молоко"],
                });

            expect(res.status).toBe(401);
        });
    });

    describe("GET /api/recipes", () => {
        beforeEach(async () => {
            await Recipe.create([
                {
                    title: "Борщ",
                    difficulty: "hard",
                    cookingTimeMinutes: 120,
                    ingredients: ["Буряк"],
                    ownerId: testUserId,
                },
                {
                    title: "Омлет",
                    difficulty: "easy",
                    cookingTimeMinutes: 10,
                    ingredients: ["Яйця"],
                    ownerId: testUserId,
                },
            ]);
        });

        it("Повинен повертати обʼєкт з data та pagination", async () => {
            const res = await request(app).get("/api/recipes");

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.total).toBe(2);
        });

        it("Повинен коректно застосовувати фільтрацію Mongoose", async () => {
            const res = await request(app).get("/api/recipes?difficulty=easy");

            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].title).toBe("Омлет");
        });

        it("Повинен фільтрувати за title та maxTime", async () => {
            await Recipe.create([
                {
                    title: "Млинці з сиром",
                    difficulty: "easy",
                    cookingTimeMinutes: 20,
                    ingredients: ["Сир"],
                    ownerId: testUserId,
                },
                {
                    title: "Млинці з мʼясом",
                    difficulty: "medium",
                    cookingTimeMinutes: 40,
                    ingredients: ["Мʼясо"],
                    ownerId: testUserId,
                },
            ]);

            const res = await request(app).get("/api/recipes?title=Млинці&maxTime=30");
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].title).toBe("Млинці з сиром");
        });
    });

    describe("GET /api/recipes/random", () => {
        it("Повинен повертати випадковий рецепт", async () => {
            await Recipe.create({
                title: "Тест 1",
                difficulty: "easy",
                cookingTimeMinutes: 10,
                ingredients: ["1"],
                ownerId: testUserId,
            });

            const res = await request(app).get("/api/recipes/random");
            expect(res.status).toBe(200);
            expect(res.body.title).toBeDefined();
        });

        it("Повинен повертати 404, якщо база порожня", async () => {
            const res = await request(app).get("/api/recipes/random");
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/recipes/:id", () => {
        it("Повинен повертати рецепт за існуючим UUID", async () => {
            const recipe = await Recipe.create({
                title: "Піца",
                difficulty: "medium",
                cookingTimeMinutes: 45,
                ingredients: ["Тісто"],
                ownerId: testUserId,
            });

            const res = await request(app).get(`/api/recipes/${recipe.id}`);
            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Піца");
        });

        it("Повинен повертати 404, якщо рецепт з валідним ID не знайдено", async () => {
            const res = await request(app).get("/api/recipes/e4b2a1f8-7c3d-421b-bc5a-9d8e7f6a5b4c");
            expect(res.status).toBe(404);
        });
    });

    describe("PUT /api/recipes/:id", () => {
        let recipeId: string;
        beforeEach(async () => {
            const recipe = await Recipe.create({
                title: "Стара назва",
                difficulty: "medium",
                cookingTimeMinutes: 45,
                ingredients: ["Тісто"],
                ownerId: testUserId,
            });
            recipeId = recipe.id;
        });

        it("Повинен оновлювати існуючий документ (власник)", async () => {
            const res = await request(app)
                .put(`/api/recipes/${recipeId}`)
                .set("Cookie", [`access_token=${testToken}`])
                .send({ title: "Нова назва" });

            expect(res.status).toBe(200);
            expect(res.body.title).toBe("Нова назва");
        });

        it("Повинен повернути 403 Forbidden, якщо оновлює не власник", async () => {
            const res = await request(app)
                .put(`/api/recipes/${recipeId}`)
                .set("Cookie", [`access_token=${anotherToken}`])
                .send({ title: "Хакерська назва" });

            expect(res.status).toBe(403);
        });

        it("Повинен повернути 404, якщо рецепта не існує", async () => {
            const res = await request(app)
                .put("/api/recipes/e4b2a1f8-7c3d-421b-bc5a-9d8e7f6a5b4c")
                .set("Cookie", [`access_token=${testToken}`])
                .send({ title: "Нова назва" });

            expect(res.status).toBe(404);
        });
    });

    describe("DELETE /api/recipes/:id", () => {
        let recipeId: string;
        beforeEach(async () => {
            const recipe = await Recipe.create({
                title: "На видалення",
                difficulty: "easy",
                cookingTimeMinutes: 10,
                ingredients: ["Вода"],
                ownerId: testUserId,
            });
            recipeId = recipe.id;
        });

        it("Повинен видаляти існуючий документ (власник)", async () => {
            const res = await request(app)
                .delete(`/api/recipes/${recipeId}`)
                .set("Cookie", [`access_token=${testToken}`]);
            expect(res.status).toBe(204);
        });

        it("Повинен повернути 403 Forbidden, якщо видаляє не власник", async () => {
            const res = await request(app)
                .delete(`/api/recipes/${recipeId}`)
                .set("Cookie", [`access_token=${anotherToken}`]);
            expect(res.status).toBe(403);
        });

        it("Повинен повернути 404, якщо рецепта не існує", async () => {
            const res = await request(app)
                .delete("/api/recipes/e4b2a1f8-7c3d-421b-bc5a-9d8e7f6a5b4c")
                .set("Cookie", [`access_token=${testToken}`]);
            expect(res.status).toBe(404);
        });
    });

    describe("GET /api/recipes/ingredient/:ingredient", () => {
        it("Повинен повертати рецепти, що містять вказаний інгредієнт", async () => {
            await Recipe.create({
                title: "Торт",
                difficulty: "hard",
                cookingTimeMinutes: 120,
                ingredients: ["Цукор", "Борошно"],
                ownerId: testUserId,
            });

            const res = await request(app).get("/api/recipes/ingredient/Цукор");
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe("Торт");
        });
    });

    describe("Перевірка обробки помилок сервера (catch blocks у маршрутах)", () => {
        afterEach(() => {
            jest.restoreAllMocks();
        });

        it("GET /api/recipes/random повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe, "aggregate").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app).get("/api/recipes/random");
            expect(res.status).toBe(500);
        });

        it("GET /api/recipes повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe, "countDocuments").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app).get("/api/recipes");
            expect(res.status).toBe(500);
        });

        it("GET /api/recipes/:id повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe, "findOne").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app).get("/api/recipes/some-id");
            expect(res.status).toBe(500);
        });

        it("POST /api/recipes повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe.prototype, "save").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app)
                .post("/api/recipes")
                .set("Cookie", [`access_token=${testToken}`])
                .send({
                    title: "Тест",
                    difficulty: "easy",
                    cookingTimeMinutes: 10,
                    ingredients: ["1"],
                });
            expect(res.status).toBe(500);
        });

        it("PUT /api/recipes/:id повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe, "findOne").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app)
                .put("/api/recipes/some-id")
                .set("Cookie", [`access_token=${testToken}`])
                .send({ title: "New" });
            expect(res.status).toBe(500);
        });

        it("DELETE /api/recipes/:id повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe, "findOne").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app)
                .delete("/api/recipes/some-id")
                .set("Cookie", [`access_token=${testToken}`]);
            expect(res.status).toBe(500);
        });

        it("GET /api/recipes/ingredient/:ingredient повинен передавати помилку в next", async () => {
            jest.spyOn(Recipe, "find").mockRejectedValueOnce(new Error("DB Error"));
            const res = await request(app).get("/api/recipes/ingredient/test");
            expect(res.status).toBe(500);
        });
    });

    describe("Unit-тести errorHandler", () => {
        let mockReq: any, mockRes: any, mockNext: any;

        beforeEach(() => {
            mockReq = {};
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn(),
            };
            mockNext = jest.fn();
        });

        it("Повинен обробляти mongoose.Error.ValidationError", () => {
            const err: any = new mongoose.Error.ValidationError(undefined);
            err.errors = { field: { message: "Помилка схеми БД" } };

            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: "Помилка валідації БД (Mongoose)",
                }),
            );
        });

        it("Повинен обробляти mongoose.Error.CastError", () => {
            const err = new mongoose.Error.CastError("string", "invalid_val", "somePath");

            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: expect.stringContaining("Невалідний формат даних"),
                }),
            );
        });

        it("Повинен обробляти дублікати MongoServerError (11000)", () => {
            const err = { name: "MongoServerError", code: 11000 };

            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(409);
        });

        it("Повинен обробляти непередбачені помилки (500)", () => {
            const err = new Error("Some standard error");

            errorHandler(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
