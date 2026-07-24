import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";

export const createOrUpdateMembershipPlanSchema = zod.object({
    name: zod.string().trim().min(1, "Name is required").min(3, "Name must be at least 3 characters"),
    price: zod.number().positive("Price must be greater than 0"),
    duration_days: zod.number().positive("Duration must be greater than 0").int("Duration must be an integer"),
    description: zod.string().trim(),
});

export const membershipPlanQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(10),
    search: zod.string().optional().default(""),
});

export const getAllMembershipPlans = asyncHandler(async (req, res) => {
    const validation = membershipPlanQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { page, limit, search } = validation.data;
    const { skip, take } = getPagination(page, limit);

    const searchFilter = search ?
        {
            OR: [{ name: { contains: search} }],
        }
        : {};

    const [membershipPlans, total] = await Promise.all([
        prisma.membership_plans.findMany({
            where: searchFilter,
            skip,
            take,
            orderBy: {
                id: "desc",
            },
        }),
        prisma.membership_plans.count({
            where: searchFilter,
        }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: membershipPlans, pagination: getPaginationMeta(total, page, limit), });
});

export const getParticularMembershipPlan = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const getMembershipPlan = await prisma.membership_plans.findUnique({
        where: { id: Number(id) }
    })
    if (!getMembershipPlan) {
        throw new AppError("Membership plan not found", 404)
    }
    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getMembershipPlan });
});

export const addNewMembershipPlan = asyncHandler(async (req, res) => {
    const validation = createOrUpdateMembershipPlanSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }


    const { name, price, duration_days, description } = req.body;
    const addMembershipPlan = await prisma.membership_plans.create({
        data: {
            name: name,
            price: price,
            duration_days: duration_days,
            description: description
        }
    });
    return sendResponse(res, { status: 201, success: true, message: 'Membership plan created successfully', data: addMembershipPlan })
});

export const updateParticularMembershipPlan = asyncHandler(async (req, res) => {
    const validation = createOrUpdateMembershipPlanSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    const { id } = req.params;
    const { name, price, duration_days, description } = req.body;
    const findMembershipPlan = await prisma.membership_plans.findUnique({
        where: { id: Number(id) }
    });

    if (!findMembershipPlan) {
        throw new AppError("Record Not Found", 404);
    }

    const updateMembershipPlan = await prisma.membership_plans.update({
        data: {
            name: name,
            price: price,
            duration_days: duration_days,
            description: description
        },
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Membership plan updated successfully', data: updateMembershipPlan })
});

export const deleteMembershipPlan = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const findMembershipPlan = await prisma.membership_plans.findUnique({
        where: { id: Number(id) }
    });
    if (!findMembershipPlan) {
        throw new AppError("Record Not Found", 404);
    }

    const deleteMembershipPlan = await prisma.membership_plans.delete({
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Membership plan deleted successfully' })
});