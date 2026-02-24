import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
    console.error("Error:", err.message);

    if (err instanceof ZodError) {
        res.status(400).json({
            error: "Validation error",
            details: err.errors.map((e) => ({
                field: e.path.join("."),
                message: e.message,
            })),
        });
        return;
    }

    if (err.name === "PrismaClientKnownRequestError") {
        res.status(400).json({ error: "Database error", message: err.message });
        return;
    }

    res.status(500).json({ error: "Internal server error", message: err.message });
}
