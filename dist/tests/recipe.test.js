"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = __importDefault(require("../src/app"));
const mongoose_1 = __importDefault(require("mongoose"));
const recipe_model_1 = require("../src/models/recipe.model");
const setup_1 = require("./setup");
const errorHandler_1 = require("../src/middleware/errorHandler");
beforeAll(async () => {
    await (0, setup_1.connectDBForTesting)();
});
afterEach(async () => {
    await (0, setup_1.clearDBForTesting)();
});
afterAll(async () => {
    await (0, setup_1.disconnectDBForTesting)();
});
describe('Unit-тести Recipe', () => {
    it('Повинна успішно створювати документ із правильними дефолтами та віртуальними полями', async () => {
        const recipeData = {
            title: 'Тестовий рецепт',
            difficulty: 'easy',
            cookingTimeMinutes: 25,
            ingredients: ['Інгредієнт 1']
        };
        const recipe = new recipe_model_1.Recipe(recipeData);
        await recipe.save();
        expect(recipe.id).toBeDefined(); // Автоматична генерація UUID
        expect(recipe.createdAt).toBeDefined(); // Timestamps
        expect(recipe.updatedAt).toBeDefined();
        // Перевірка віртуальних властивостей
        expect(recipe.isQuickRecipe).toBe(true);
        expect(recipe.formattedCookingTime).toBe('25 хв');
    });
    it('Повинна викидати помилку при невалідних даних (кастомні валідатори Mongoose)', async () => {
        const invalidRecipe = new recipe_model_1.Recipe({
            title: '', // Занадто коротке
            difficulty: 'super-hard', // Не входить в enum
            cookingTimeMinutes: -5, // Має бути позитивним
            ingredients: [] // Порожній масив
        });
        let err;
        try {
            await invalidRecipe.save();
        }
        catch (error) {
            err = error;
        }
        expect(err).toBeInstanceOf(mongoose_1.default.Error.ValidationError);
        expect(err.errors.title).toBeDefined();
        expect(err.errors.difficulty).toBeDefined();
        expect(err.errors.cookingTimeMinutes).toBeDefined();
        expect(err.errors.ingredients).toBeDefined();
    });
    it('Повинна коректно форматувати час (години та хвилини)', () => {
        const recipe = new recipe_model_1.Recipe({
            title: 'Борщ', difficulty: 'medium', cookingTimeMinutes: 75, ingredients: ['Буряк']
        });
        expect(recipe.formattedCookingTime).toBe('1 год 15 хв');
        const recipeExactHour = new recipe_model_1.Recipe({
            title: 'Каша', difficulty: 'easy', cookingTimeMinutes: 60, ingredients: ['Крупа']
        });
        expect(recipeExactHour.formattedCookingTime).toBe('1 год');
    });
});
describe('Інтеграційні тести API Recipe', () => {
    describe('POST /api/recipes', () => {
        it('Повинен створити новий рецепт та повернути статус 201', async () => {
            const res = await (0, supertest_1.default)(app_1.default).post('/api/recipes').send({
                title: 'Млинці',
                difficulty: 'easy',
                cookingTimeMinutes: 20,
                ingredients: ['Молоко', 'Яйця']
            });
            expect(res.status).toBe(201);
            expect(res.body.title).toBe('Млинці');
            expect(res.body.id).toBeDefined();
        });
        it('Повинен повернути 400 при помилці валідації Zod (немає назви)', async () => {
            const res = await (0, supertest_1.default)(app_1.default).post('/api/recipes').send({
                difficulty: 'easy',
                cookingTimeMinutes: 20,
                ingredients: ['Молоко']
            });
            expect(res.status).toBe(400);
            expect(res.body.message).toContain('Zod');
        });
    });
    describe('GET /api/recipes', () => {
        beforeEach(async () => {
            await recipe_model_1.Recipe.create([
                { title: 'Борщ', difficulty: 'hard', cookingTimeMinutes: 120, ingredients: ['Буряк'] },
                { title: 'Омлет', difficulty: 'easy', cookingTimeMinutes: 10, ingredients: ['Яйця'] }
            ]);
        });
        it('Повинен повертати обʼєкт з data та pagination', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(2);
            expect(res.body.pagination).toBeDefined();
            expect(res.body.pagination.total).toBe(2);
        });
        it('Повинен коректно застосовувати фільтрацію Mongoose', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes?difficulty=easy');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].title).toBe('Омлет');
        });
        it('Повинен фільтрувати за title та maxTime', async () => {
            await recipe_model_1.Recipe.create([
                { title: 'Млинці з сиром', difficulty: 'easy', cookingTimeMinutes: 20, ingredients: ['Сир'] },
                { title: 'Млинці з мʼясом', difficulty: 'medium', cookingTimeMinutes: 40, ingredients: ['Мʼясо'] }
            ]);
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes?title=Млинці&maxTime=30');
            expect(res.status).toBe(200);
            expect(res.body.data).toHaveLength(1);
            expect(res.body.data[0].title).toBe('Млинці з сиром');
        });
    });
    describe('GET /api/recipes/:id', () => {
        it('Повинен повертати рецепт за існуючим UUID', async () => {
            const recipe = await recipe_model_1.Recipe.create({
                title: 'Піца', difficulty: 'medium', cookingTimeMinutes: 45, ingredients: ['Тісто']
            });
            const res = await (0, supertest_1.default)(app_1.default).get(`/api/recipes/${recipe.id}`);
            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Піца');
        });
        it('Повинен повертати 404, якщо рецепт з валідним ID не знайдено', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/e4b2a1f8-7c3d-421b-bc5a-9d8e7f6a5b4c');
            expect(res.status).toBe(404);
        });
    });
    describe('GET /api/recipes/random', () => {
        it('Повинен повертати випадковий рецепт', async () => {
            await recipe_model_1.Recipe.create({ title: 'Тест 1', difficulty: 'easy', cookingTimeMinutes: 10, ingredients: ['1'] });
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/random');
            expect(res.status).toBe(200);
            expect(res.body.title).toBeDefined();
        });
        it('Повинен повертати 404, якщо база порожня', async () => {
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/random');
            expect(res.status).toBe(404);
        });
    });
    describe('PUT /api/recipes/:id', () => {
        it('Повинен оновлювати існуючий документ', async () => {
            const recipe = await recipe_model_1.Recipe.create({
                title: 'Стара назва', difficulty: 'medium', cookingTimeMinutes: 45, ingredients: ['Тісто']
            });
            const res = await (0, supertest_1.default)(app_1.default).put(`/api/recipes/${recipe.id}`).send({
                title: 'Нова назва'
            });
            expect(res.status).toBe(200);
            expect(res.body.title).toBe('Нова назва');
        });
        it('Повинен повертати 404 для неіснуючого рецепту', async () => {
            const res = await (0, supertest_1.default)(app_1.default).put('/api/recipes/non-existent-uuid').send({ title: 'Нова назва' });
            expect(res.status).toBe(404);
        });
    });
    describe('DELETE /api/recipes/:id', () => {
        it('Повинен видаляти існуючий документ', async () => {
            const recipe = await recipe_model_1.Recipe.create({
                title: 'На видалення', difficulty: 'easy', cookingTimeMinutes: 10, ingredients: ['Вода']
            });
            const res = await (0, supertest_1.default)(app_1.default).delete(`/api/recipes/${recipe.id}`);
            expect(res.status).toBe(204); // або 200, залежить від вашої реалізації контролера
            const dbCheck = await recipe_model_1.Recipe.findOne({ id: recipe.id });
            expect(dbCheck).toBeNull();
        });
        it('Повинен повертати 404 для неіснуючого рецепту', async () => {
            const res = await (0, supertest_1.default)(app_1.default).delete('/api/recipes/non-existent-uuid');
            expect(res.status).toBe(404);
        });
    });
    describe('GET /api/recipes/ingredient/:ingredient', () => {
        it('Повинен повертати рецепти, що містять вказаний інгредієнт', async () => {
            await recipe_model_1.Recipe.create({
                title: 'Торт', difficulty: 'hard', cookingTimeMinutes: 120, ingredients: ['Цукор', 'Борошно']
            });
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/ingredient/Цукор');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
            expect(res.body[0].title).toBe('Торт');
        });
    });
    describe('Перевірка обробки помилок сервера (catch blocks у маршрутах)', () => {
        // Відновлюємо оригінальні методи після кожного тесту, щоб не зламати інші тести
        afterEach(() => {
            jest.restoreAllMocks();
        });
        it('GET /api/recipes/random повинен передавати помилку в next', async () => {
            jest.spyOn(recipe_model_1.Recipe, 'aggregate').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/random');
            expect(res.status).toBe(500);
        });
        it('GET /api/recipes повинен передавати помилку в next', async () => {
            jest.spyOn(recipe_model_1.Recipe, 'countDocuments').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes');
            expect(res.status).toBe(500);
        });
        it('GET /api/recipes/:id повинен передавати помилку в next', async () => {
            jest.spyOn(recipe_model_1.Recipe, 'findOne').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/some-id');
            expect(res.status).toBe(500);
        });
        it('POST /api/recipes повинен передавати помилку в next', async () => {
            // Для створення ми мокаємо метод save на прототипі моделі
            jest.spyOn(recipe_model_1.Recipe.prototype, 'save').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).post('/api/recipes').send({
                title: 'Тест', difficulty: 'easy', cookingTimeMinutes: 10, ingredients: ['1']
            });
            expect(res.status).toBe(500);
        });
        it('PUT /api/recipes/:id повинен передавати помилку в next', async () => {
            jest.spyOn(recipe_model_1.Recipe, 'findOneAndUpdate').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).put('/api/recipes/some-id').send({ title: 'New' });
            expect(res.status).toBe(500);
        });
        it('DELETE /api/recipes/:id повинен передавати помилку в next', async () => {
            jest.spyOn(recipe_model_1.Recipe, 'findOneAndDelete').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).delete('/api/recipes/some-id');
            expect(res.status).toBe(500);
        });
        it('GET /api/recipes/ingredient/:ingredient повинен передавати помилку в next', async () => {
            jest.spyOn(recipe_model_1.Recipe, 'find').mockRejectedValueOnce(new Error('DB Error'));
            const res = await (0, supertest_1.default)(app_1.default).get('/api/recipes/ingredient/test');
            expect(res.status).toBe(500);
        });
    });
    describe('Unit-тести errorHandler', () => {
        let mockReq, mockRes, mockNext;
        beforeEach(() => {
            mockReq = {};
            mockRes = {
                status: jest.fn().mockReturnThis(),
                json: jest.fn()
            };
            mockNext = jest.fn();
        });
        it('Повинен обробляти mongoose.Error.ValidationError', () => {
            const err = new mongoose_1.default.Error.ValidationError(undefined);
            err.errors = { field: { message: 'Помилка схеми БД' } };
            (0, errorHandler_1.errorHandler)(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: 'Помилка валідації БД (Mongoose)'
            }));
        });
        it('Повинен обробляти mongoose.Error.CastError', () => {
            const err = new mongoose_1.default.Error.CastError('string', 'invalid_val', 'somePath');
            (0, errorHandler_1.errorHandler)(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Невалідний формат даних')
            }));
        });
        it('Повинен обробляти дублікати MongoServerError (11000)', () => {
            const err = { name: 'MongoServerError', code: 11000 };
            (0, errorHandler_1.errorHandler)(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(409);
        });
        it('Повинен обробляти непередбачені помилки (500)', () => {
            const err = new Error('Some standard error');
            (0, errorHandler_1.errorHandler)(err, mockReq, mockRes, mockNext);
            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
