import type { Request, Response, NextFunction } from "express";

export const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    console.error(err);

    return res.status(err.statusCode || 500).json({
        status: err.statusCode || 500,
        success: false,
        message: err.message || "Internal Server Error",
    });
};