import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { verifyToken } from "../utils/jwt";
import { JwtPayload } from "../types";

// Extend Express Request to include user
declare global {
    namespace Express {
        interface Request {
            user?: JwtPayload;
        }
    }
}

export function authenticate(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        res.status(401).json({ error: "No token provided" });
        return;
    }

    try {
        const token = authHeader.split(" ")[1];
        const payload = verifyToken(token);
        req.user = payload;
        next();
    } catch (err) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
}

export function requireRole(...roles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({ error: "Not authenticated" });
            return;
        }
        if (!roles.includes(req.user.role)) {
            res.status(403).json({ error: "Insufficient permissions" });
            return;
        }
        next();
    };
}
