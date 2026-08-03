import jwt from "jsonwebtoken";
import { prisma } from "../config/db.ts";

export const getUserFromToken = async (token: string | undefined) => {
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET is not defined");

    try {
        const payload = jwt.verify(token, secret) as { email: string };
        return await prisma.users.findUnique({ where: { email: payload.email } });
    } catch {
        return null; // expired, tampered, or malformed token
    }
};
