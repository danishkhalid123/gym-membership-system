import bcrypt from 'bcrypt';
import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";
import { asyncHandler } from "../../middlewares/async-handler.ts";

export const createOrUpdateUserSchema = zod.object({
    name: zod.string(),
    email: zod.string().email().trim().toLowerCase(),
    password: zod.string().min(8).trim(),
    role: zod.string().trim()
});

export const getAllUsers = asyncHandler(async (req, res) => {
    const getUsers = await prisma.users.findMany();
    return sendResponse(res, { status: 200, success: true, message: "Operational successfull", data: getUsers })
});

export const getParticularUser = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const getUser = await prisma.users.findUnique({
        where: { id: Number(id) }
    })
    if (!getUser) {
        throw new AppError("User not found", 404)
    }
    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getUser });
});

export const addNewUser = asyncHandler(async (req, res) => {
    const validation = createOrUpdateUserSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    const { email, password, name, role } = validation.data;
    //check already in a table or not
    const findUser = await prisma.users.findUnique({
        where: { email: email }
    })
    if (findUser) {
        throw new AppError("User already found", 400);
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

    return sendResponse(res, { status: 201, success: true, message: 'User created successfully', data: user })
});

export const updateParticularUser = asyncHandler(async (req, res) => {
    const validation = createOrUpdateUserSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    const { id } = req.params;
    const { email, password, name, role } = validation.data;
    const findUser = await prisma.users.findUnique({
        where: { id: Number(id) }
    });

    if (!findUser) {
        throw new AppError("User Not Found", 404);
    }

    var hashedPassword: string = '';
    if (password) {
        const salt = await bcrypt.genSalt(10);
        hashedPassword = await bcrypt.hash(password, salt);
    }

    const updateUser = await prisma.users.update({
        data: {
            email: email,
            password: hashedPassword,
            name: name,
            role: role
        },
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'User updated successfully', data: updateUser })
});

export const deleteUser = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const findUser = await prisma.users.findUnique({
        where: { id: Number(id) }
    });
    if (!findUser) {
        throw new AppError("User Not Found", 404);
    }

    const deleteUser = await prisma.users.delete({
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'User deleted successfully' })
});