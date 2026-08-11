import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";

export const createOrUpdateDiscountSchema = zod.object({
    code: zod.string().trim().min(1, "Name is required").min(3, "Name must be at least 3 characters"),
    value: zod.number().min(1, "Value is required").max(99, "Value must be in between 1 to 99"),
    type: zod.string().trim().min(1, "Type is required").min(3, "Type must be at least 3 characters"),
    status: zod.string().trim().min(1, "Status is required").min(3, "Status must be at least 3 characters"),
});

export const discountQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(10),
    search: zod.string().optional().default(""),
});

export const updateDiscountStatusSchema = zod.object({
    status: zod.enum([
        "active",
        "inactive",
    ]),
});

export const getAllDiscounts = asyncHandler(async (req, res) => {
    const validation = discountQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { page, limit, search } = validation.data;
    const { skip, take } = getPagination(page, limit);

    const searchFilter = search ?
        {
            OR: [{ code: { contains: search } }],
        }
        : {};

    const [discounts, total] = await Promise.all([
        prisma.discounts.findMany({
            where: searchFilter,
            skip,
            take,
            orderBy: {
                id: "desc",
            },
        }),
        prisma.discounts.count({
            where: searchFilter,
        }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: discounts, pagination: getPaginationMeta(total, page, limit), });
});

export const getParticularDiscount = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const getDiscount = await prisma.discounts.findUnique({
        where: { id: Number(id) }
    })
    if (!getDiscount) {
        throw new AppError("Discount not found", 404)
    }
    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getDiscount });
});

export const addNewDiscount = asyncHandler(async (req, res) => {
    const validation = createOrUpdateDiscountSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }


    const { code, type, status, value } = req.body;
    const addDiscount = await prisma.discounts.create({
        data: {
            code: code,
            value: value,
            type: type,
            status: status,
        }
    });
    return sendResponse(res, { status: 201, success: true, message: 'Discount created successfully', data: addDiscount })
});

export const updateParticularDiscount = asyncHandler(async (req, res) => {
    const validation = createOrUpdateDiscountSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    const { id } = req.params;
    const { code, type, status, value } = req.body;
    const findDiscount = await prisma.discounts.findUnique({
        where: { id: Number(id) }
    });

    if (!findDiscount) {
        throw new AppError("Record Not Found", 404);
    }

    const updateDiscount = await prisma.discounts.update({
        data: {
            code: code,
            value: value,
            type: type,
            status: status,
        },
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Discount updated successfully', data: updateDiscount })
});

export const deleteDiscount = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const findDiscount = await prisma.discounts.findUnique({
        where: { id: Number(id) }
    });
    if (!findDiscount) {
        throw new AppError("Record Not Found", 404);
    }

    const deleteDiscount = await prisma.discounts.delete({
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Discount deleted successfully' })
});

export const updateDiscountStatus = asyncHandler(async (req, res) => {
    const validation = updateDiscountStatusSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }

    const { id } = req.params;
    const { status } = validation.data;

    const discount = await prisma.discounts.findUnique({
        where: { id: Number(id) },
    });

    if (!discount) {
        throw new AppError("Discount not found", 404);
    }

    const updatedDiscount = await prisma.discounts.update({
        where: { id: Number(id) },
        data: { status },
    });

    return sendResponse(res, { status: 200, success: true, message: "Discount status updated successfully", data: updatedDiscount, });
});