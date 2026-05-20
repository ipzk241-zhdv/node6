import { Router, Request, Response, NextFunction } from "express";
import { User } from "../models/user.model";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";

const router = Router();

const authSchema = z.object({
    email: z.string().email("Некоректний формат email"),
    password: z.string().min(6, "Пароль має містити щонайменше 6 символів"),
});

router.post("/register", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = authSchema.parse(req.body);

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(409).json({ message: "Користувач з таким email вже існує" });
            return;
        }

        const newUser = await User.create({ email, password });

        res.status(201).json({
            id: newUser._id,
            email: newUser.email,
            createdAt: newUser.createdAt,
        });
    } catch (error) {
        next(error);
    }
});

router.post("/login", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            res.status(401).json({ message: "Неправильний email або пароль" });
            return;
        }

        const accessToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET as string, { expiresIn: "15m" });
        const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET as string, {
            expiresIn: "30d",
        });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict" as const,
        };

        res.cookie("access_token", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie("refresh_token", refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

        res.status(200).json({ message: "Успішний вхід" });
    } catch (error) {
        next(error);
    }
});

router.post("/refresh", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.refresh_token;
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string) as { userId: string };

        const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET as string, {
            expiresIn: "15m",
        });
        const refreshToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_REFRESH_SECRET as string, {
            expiresIn: "30d",
        });

        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict" as const,
        };

        res.cookie("access_token", accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 });
        res.cookie("refresh_token", refreshToken, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });

        res.status(200).json({ message: "Токени оновлено" });
    } catch (error) {
        res.status(401).json({ message: "Unauthorized" });
    }
});

router.post("/logout", (req: Request, res: Response) => {
    res.clearCookie("access_token");
    res.clearCookie("refresh_token");
    res.status(200).json({ message: "Успішний вихід" });
});

export default router;
