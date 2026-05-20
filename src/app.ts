import express from "express";
import cors from "cors";
import recipeRoutes from "./routes/recipe";
import { errorHandler } from "./middleware/errorHandler";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth";

const app = express();

app.use(
    cors({
        origin: true,
        credentials: true,
    }),
);

app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/recipes", recipeRoutes);

app.use(errorHandler);

export default app;
