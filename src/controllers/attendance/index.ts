import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";

export const createOrUpdateAttandanceSchema = zod.object({
    user_id: zod.number(),
    checkin_time: zod.string(),
    checkout_time: zod.string().nullable(),
});

export const checkoutSchema = zod.object({
    user_id: zod.number(),
    checkout_time: zod.string().nullable(),
});

export const attendanceQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(10),
    checkin_date: zod.string().optional(),
    checkout_date: zod.string().optional(),
});


export const getAllAttendance = asyncHandler(async (req, res) => {
    const validation = attendanceQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { page, limit, checkin_date,checkout_date } = validation.data;
    const { skip, take } = getPagination(page, limit);


    const searchFilter: any = {};

    if (checkin_date) {
        searchFilter.checkin_time = {
            gte: new Date(`${checkin_date}T00:00:00.000Z`),
            lt: new Date(`${checkin_date}T23:59:59.999Z`),
        };
    }

    if (checkout_date) {
        searchFilter.checkout_time = {
            gte: new Date(`${checkout_date}T00:00:00.000Z`),
            lt: new Date(`${checkout_date}T23:59:59.999Z`),
        };
    }

    const [attendanceData, total] = await Promise.all([
        prisma.attendance.findMany({
            where: searchFilter,
            skip,
            take,
            orderBy: {
                id: "desc",
            },
        }),
        prisma.attendance.count({
            where: searchFilter,
        }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: attendanceData, pagination: getPaginationMeta(total, page, limit), });

});

export const getParticularAttandance = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const getAttandance = await prisma.attendance.findMany({
        where: { user_id: Number(id) },
        orderBy: { checkin_time: 'desc' }
    })
    if (getAttandance.length === 0) {
        throw new AppError("Attandance not found", 404)
    }
    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getAttandance });
});

export const addNewAttandance = asyncHandler(async (req, res) => {
    const validation = createOrUpdateAttandanceSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    const { checkin_time, checkout_time, user_id } = req.body;

    const getUserId = await prisma.users.findUnique({
        where: { id: Number(user_id) }
    });

    if (!getUserId) {
        throw new AppError("User id not found", 404)
    }

    const checkinDate = new Date(checkin_time);
    const checkoutDate = new Date();

    if (isNaN(checkoutDate.getTime())) {
        throw new AppError("Invalid checkout time", 400);
    }

    if (checkoutDate <= checkinDate) {
        throw new AppError("Checkout time must be greater than check-in time", 400);
    }


    const addAttandance = await prisma.attendance.create({
        data: {
            checkin_time: checkinDate,
            checkout_time: checkout_time !== null ? checkoutDate : null,
            user_id: user_id,
        }
    });
    return sendResponse(res, { status: 201, success: true, message: 'Attandance created successfully', data: addAttandance })
});


export const updateAttandance = asyncHandler(async (req, res) => {
    const validation = createOrUpdateAttandanceSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    const { checkin_time, checkout_time, user_id } = req.body;

    const getUserId = await prisma.users.findUnique({
        where: { id: Number(user_id) }
    });

    if (!getUserId) {
        throw new AppError("User id not found", 404)
    }

    const checkinDate = new Date(checkin_time);
    const checkoutDate = new Date(checkout_time);

    if (isNaN(checkoutDate.getTime())) {
        throw new AppError("Invalid checkout time", 400);
    }

    if (checkoutDate <= checkinDate) {
        throw new AppError("Checkout time must be greater than check-in time", 400);
    }

    const updateAttandance = await prisma.attendance.create({
        data: {
            checkin_time: checkinDate,
            checkout_time: checkout_time !== null ? new Date(checkout_time) : null,
            user_id: user_id,
        }
    });
    return sendResponse(res, { status: 201, success: true, message: 'Attandance updated successfully', data: updateAttandance })
});

export const checkoutAttendance = asyncHandler(async (req, res) => {
    const validation = checkoutSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }

    const { checkout_time, user_id } = req.body;

    const getUserId = await prisma.users.findUnique({
        where: { id: Number(user_id) }
    });

    if (!getUserId) {
        throw new AppError("User id not found", 404)
    }


    const attendance = await prisma.attendance.findFirst({
        where: {
            user_id: Number(user_id),
            checkout_time: null,
        },
        orderBy: {
            checkin_time: "desc",
        },
    });

    if (!attendance) {
        throw new AppError("No active check-in found", 404);
    }

    const checkoutDate = new Date(checkout_time);

    if (isNaN(checkoutDate.getTime())) {
        throw new AppError("Invalid checkout time", 400);
    }

    if (checkoutDate <= attendance.checkin_time) {
        throw new AppError("Checkout time must be greater than check-in time", 400);
    }

    const updateAttandance = await prisma.attendance.update({
        data: {
            checkin_time: attendance.checkin_time,
            checkout_time: checkoutDate,
            user_id: user_id,
        },
        where: { id: attendance.id }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Checkout successfully', data: updateAttandance })
});