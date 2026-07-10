import jwt from 'jsonwebtoken';
import { prisma } from "../../config/db.ts";
import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";

export const profile = async (req: any, res: any) => {
    try {
        const authHeader = req.get('Authorization');
        if (!authHeader) {
            throw new AppError('No token provided', 401)
        }

        const token = authHeader.startsWith('Bearer ')
            ? authHeader.split(' ')[1]
            : authHeader;

        const payload: any = jwt.decode(token);
        const checkUser = await prisma.users.findUnique({
            where: { email: payload.email }
        })

        if (!checkUser) {
            throw new AppError("User not found", 401);
        }
        return sendResponse(res, { status: 200, success: true, message: "Operation Successfull", data: { user: checkUser, token: token } });
        return null;
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Something went wrong!", 400);

    }
}

