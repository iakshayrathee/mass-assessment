import { Request, Response, NextFunction } from "express";
import { authService } from "../services/auth.service";
import { loginSchema } from "../utils/validators";

export const authController = {
    async login(req: Request, res: Response, next: NextFunction) {
        try {
            const data = loginSchema.parse(req.body);
            const result = await authService.login(data.email, data.password);
            res.json(result);
        } catch (err: any) {
            if (err.message === "Invalid email or password") {
                res.status(401).json({ error: err.message });
            } else {
                next(err);
            }
        }
    },

    async getProfile(req: Request, res: Response, next: NextFunction) {
        try {
            const profile = await authService.getProfile(req.user!.userId);
            res.json(profile);
        } catch (err) {
            next(err);
        }
    },
};
