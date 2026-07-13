import bcrypt from 'bcrypt';
import zod from 'zod';
import { generateToken } from '../../utils/generate-token.ts';
import { prisma } from '../../config/db.ts';
import { sendResponse } from '../../utils/api-response.ts';
import { AppError } from '../../utils/app-errors.ts';
import { asyncHandler } from '../../middlewares/async-handler.ts';

const schemaAuthLogin = zod.object({
    email: zod.string().email().trim().toLowerCase(),
    password: zod.string().min(8).trim(),
});

const schemaAuthRegister = zod.object({
    name: zod.string(),
    email: zod.string().email().trim().toLowerCase(),
    password: zod.string().min(8).trim(),
    role: zod.string().trim()
});

export const register = asyncHandler(async (req, res) => {
    const result = schemaAuthRegister.safeParse(req.body);

    if (!result.success) {
        throw new AppError("Validation failed", 400);
    }
    const { email, password, name, role } = result.data;
    //check already in a table or not
    const findUser = await prisma.users.findUnique({
        where: { email: email }
    })
    if (findUser) {
        throw new AppError("Record already found", 400);
    }

    var hashedPassword: string = '';
    if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
    }

    const user = await prisma.users.create({
        data: {
            email: email,
            password: hashedPassword,
            name: name,
            role: role
        }
    });

    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: user });
});

export const login = asyncHandler(async (req, res) => {
    const result = schemaAuthLogin.safeParse(req.body);
    if (!result.success) {
        throw new AppError("Validation failed", 400);
    }
    const { email, password } = result.data;

    const checkUser = await prisma.users.findUnique({
        where: { email: email }
    })
    if (!checkUser) {
        throw new AppError("Invalid email or password", 401);
    }
    let token;
    var comparePassword;
    if (email) {
        token = generateToken(email);
    }
    if (password) {
        comparePassword = await bcrypt.compare(password, checkUser.password);
        if (!comparePassword) {
            throw new AppError("Invalid email or password", 401);
        }
    }

    res.cookie('token', token, {
        httpOnly: true,
        maxAge: (24 * 7) * 60 * 60 * 1000, // 7 days
        sameSite: 'strict'
    })
    return sendResponse(res, { status: 200, success: true, message: "Login successful", data: { user: checkUser, token: token } });
});

