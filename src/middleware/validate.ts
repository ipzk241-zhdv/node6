import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

export const validate =
    (schema: ZodSchema) =>
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                req.body = await schema.parseAsync(req.body);
                next();
            } catch (error) {
                next(error);
            }
        };
