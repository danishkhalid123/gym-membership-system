import type { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/app-errors.ts";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            success: false,
            status: err.statusCode,
            message: err.message,
        });
    }
    return res.status(500).json({
        success: false,
        status: 500,
        message: "Internal Server Error",
    });
};