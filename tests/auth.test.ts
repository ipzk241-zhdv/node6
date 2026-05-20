import request from "supertest";
import app from "../src/app";
import { User } from "../src/models/user.model";
import { connectDBForTesting, disconnectDBForTesting, clearDBForTesting } from "./setup";
import jwt from "jsonwebtoken";

beforeAll(async () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_REFRESH_SECRET = "test-refresh-secret";
    await connectDBForTesting();
});

afterEach(async () => {
    await clearDBForTesting();
    jest.restoreAllMocks();
});

afterAll(async () => {
    await disconnectDBForTesting();
});

describe("Інтеграційні тести API Auth", () => {
    describe("POST /api/auth/register", () => {
        it("Повинен успішно зареєструвати користувача", async () => {
            const res = await request(app).post("/api/auth/register").send({
                email: "newuser@example.com",
                password: "password123",
            });

            expect(res.status).toBe(201);
            expect(res.body.email).toBe("newuser@example.com");
            expect(res.body.password).toBeUndefined();

            const savedUser = await User.findOne({ email: "newuser@example.com" });
            expect(savedUser?.password).not.toBe("password123");
        });

        it("Повинен повернути 409 Conflict при дублікаті email", async () => {
            await User.create({ email: "duplicate@example.com", password: "123" });

            const res = await request(app).post("/api/auth/register").send({
                email: "duplicate@example.com",
                password: "password123",
            });

            expect(res.status).toBe(409);
        });

        it("Повинен передавати помилку в next при помилці сервера (catch block)", async () => {
            jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("DB Error"));

            const res = await request(app).post("/api/auth/register").send({
                email: "error@example.com",
                password: "password123",
            });

            expect(res.status).toBe(500);
        });
    });

    describe("POST /api/auth/login", () => {
        beforeEach(async () => {
            await request(app).post("/api/auth/register").send({
                email: "login@example.com",
                password: "password123",
            });
        });

        it("Повинен успішно залогінити та видати cookies з токенами", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "login@example.com",
                password: "password123",
            });

            expect(res.status).toBe(200);

            const cookies = (res.headers["set-cookie"] || []) as string[];
            expect(cookies.length).toBeGreaterThan(0);
            expect(cookies.some((c) => c.includes("access_token="))).toBe(true);
            expect(cookies.some((c) => c.includes("refresh_token="))).toBe(true);
        });

        it("Повинен повернути 401 при неправильному паролі", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "login@example.com",
                password: "wrongpassword",
            });
            expect(res.status).toBe(401);
        });

        it("Повинен повернути 401, якщо користувача не знайдено", async () => {
            const res = await request(app).post("/api/auth/login").send({
                email: "notfound@example.com",
                password: "password123",
            });
            expect(res.status).toBe(401);
        });

        it("Повинен передавати помилку в next при помилці сервера (catch block)", async () => {
            jest.spyOn(User, "findOne").mockRejectedValueOnce(new Error("DB Error"));

            const res = await request(app).post("/api/auth/login").send({
                email: "login@example.com",
                password: "password123",
            });

            expect(res.status).toBe(500);
        });
    });

    describe("POST /api/auth/refresh", () => {
        let validRefreshToken: string;

        beforeEach(async () => {
            const user = await User.create({ email: "refresh@example.com", password: "password123" });
            validRefreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET as string, {
                expiresIn: "30d",
            });
        });

        it("Повинен успішно оновити токени за наявності валідного refresh_token", async () => {
            const res = await request(app)
                .post("/api/auth/refresh")
                .set("Cookie", [`refresh_token=${validRefreshToken}`]);

            expect(res.status).toBe(200);

            const cookies = (res.headers["set-cookie"] || []) as string[];
            expect(cookies.some((c) => c.includes("access_token="))).toBe(true);
            expect(cookies.some((c) => c.includes("refresh_token="))).toBe(true);
        });

        it("Повинен повернути 401, якщо refresh_token відсутній у cookies", async () => {
            const res = await request(app).post("/api/auth/refresh");
            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Unauthorized");
        });

        it("Повинен повернути 401 при невалідному (або простроченому) refresh_token", async () => {
            const res = await request(app)
                .post("/api/auth/refresh")
                .set("Cookie", ["refresh_token=some_invalid_token_string"]);

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Unauthorized");
        });
    });

    describe("POST /api/auth/logout", () => {
        it("Повинен очистити cookies при виході", async () => {
            const res = await request(app).post("/api/auth/logout");

            expect(res.status).toBe(200);

            const cookies = (res.headers["set-cookie"] || []) as string[];
            expect(cookies.some((c) => c.includes("access_token=;"))).toBe(true);
            expect(cookies.some((c) => c.includes("refresh_token=;"))).toBe(true);
        });
    });
});
