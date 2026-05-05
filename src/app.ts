import express from "express";
import cors from "cors";
import recipeRoutes from "./routes/recipe";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/recipes", recipeRoutes);

app.use(errorHandler);

export default app;

