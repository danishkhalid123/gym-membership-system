import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";

export const createOrUpdateSubscriptionSchema = zod.object({
    user_id: zod.number(),
    membership_id: zod.number(),
    start_date: zod.string(),
    end_date: zod.string(),
    status: zod.string()
});

export const subscriptionQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(10),
    start_date: zod.string().optional(),
    end_date: zod.string().optional(),
    user_id: zod.coerce.number().optional(),
    membership_id: zod.coerce.number().optional(),
});


export const getAllSubscriptions = asyncHandler(async (req, res) => {
    const validation = subscriptionQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { page, limit, start_date, end_date, user_id, membership_id, } = validation.data;
    const { skip, take } = getPagination(page, limit);

    const searchFilter: any = {};

    if (start_date) {
        searchFilter.start_date = {
            gte: new Date(`${start_date}T00:00:00.000Z`),
            lt: new Date(`${start_date}T23:59:59.999Z`),
        };
    }

    if (end_date) {
        searchFilter.end_date = {
            gte: new Date(`${end_date}T00:00:00.000Z`),
            lt: new Date(`${end_date}T23:59:59.999Z`),
        };
    }

    if (user_id) {
        searchFilter.user_id = user_id;
    }

    if (membership_id) {
        searchFilter.membership_id = membership_id;
    }

    const [subscriptionsData, total] = await Promise.all([
        prisma.subscriptions.findMany({
            where: searchFilter,
            skip,
            take,
            orderBy: {
                id: "desc",
            },
            // include: {
            //     user: true,
            //     membership_plan: true,
            // },
        }),
        prisma.subscriptions.count({
            where: searchFilter,
        }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: subscriptionsData, pagination: getPaginationMeta(total, page, limit), });
});

export const getParticularSubscription = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const getSubscription = await prisma.subscriptions.findUnique({
        where: { id: Number(id) }
    })
    if (!getSubscription) {
        throw new AppError("Subscription not found", 404)
    }
    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getSubscription });
});

export const addNewSubscription = asyncHandler(async (req, res) => {
    const validation = createOrUpdateSubscriptionSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    const { start_date, end_date, status, user_id, membership_id } = req.body;

    const getMembershipId = await prisma.membership_plans.findUnique({
        where: { id: Number(membership_id) }
    });

    if (!getMembershipId) {
        throw new AppError("Membership id not found", 404)
    }

    const getUserId = await prisma.users.findUnique({
        where: { id: Number(user_id) }
    });

    if (!getUserId) {
        throw new AppError("User id not found", 404)
    }


    const addSubscription = await prisma.subscriptions.create({
        data: {
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            status: status,
            user_id: user_id,
            membership_id: membership_id
        }
    });
    return sendResponse(res, { status: 201, success: true, message: 'Subscription created successfully', data: addSubscription })
});

export const updateParticularSubscription = asyncHandler(async (req, res) => {
    const validation = createOrUpdateSubscriptionSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    const { id } = req.params;
    const { start_date, end_date, status, user_id, membership_id } = req.body;
    const findSubscription = await prisma.subscriptions.findUnique({
        where: { id: Number(id) }
    });

    if (!findSubscription) {
        throw new AppError("Record Not Found", 404);
    }

    const getMembershipId = await prisma.subscriptions.findUnique({
        where: { id: Number(membership_id) }
    });

    if (!getMembershipId) {
        throw new AppError("Membership id not found", 404)
    }

    const getUserId = await prisma.users.findUnique({
        where: { id: Number(user_id) }
    });

    if (!getUserId) {
        throw new AppError("User id not found", 404)
    }


    const updateSubscription = await prisma.subscriptions.update({
        data: {
            start_date: new Date(start_date),
            end_date: new Date(end_date),
            status: status,
            user_id: user_id,
            membership_id: membership_id
        },
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Subscription updated successfully', data: updateSubscription })
});

export const deleteSubscription = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const findSubscription = await prisma.subscriptions.findUnique({
        where: { id: Number(id) }
    });
    if (!findSubscription) {
        throw new AppError("Record Not Found", 404);
    }

    const deleteSubscription = await prisma.subscriptions.delete({
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Subscription deleted successfully', data: deleteSubscription })
});