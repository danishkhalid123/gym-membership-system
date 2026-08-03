import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-errors.ts";
import { asyncHandler } from "./async-handler.ts";
import { getUserFromToken } from "../utils/get-user-from-token.ts";

export const requireAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader;

    const user = await getUserFromToken(token);
    if (!user) {
        throw new AppError("Unauthorized", 401);
    }

    (req as any).user = user;
    next();
});
