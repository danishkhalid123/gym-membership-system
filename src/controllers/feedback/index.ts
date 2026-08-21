import zod from "zod";
import { prisma } from "../../config/db.ts";
import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";
import { isAdminRole } from "../../utils/roles.ts";

const FEEDBACK_CATEGORIES = ["general", "trainer", "equipment", "cleanliness", "billing"] as const;
const FEEDBACK_STATUSES = ["pending", "reviewed", "resolved"] as const;

export const createOrUpdateFeedbackSchema = zod.object({
    rating: zod.coerce.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
    category: zod.enum(FEEDBACK_CATEGORIES),
    subject: zod.string().trim().min(3, "Subject must be at least 3 characters").max(120, "Subject must be at most 120 characters"),
    message: zod.string().trim().min(10, "Message must be at least 10 characters").max(1000, "Message must be at most 1000 characters"),
});

export const feedbackQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(10),
    search: zod.string().optional().default(""),
    status: zod.enum(FEEDBACK_STATUSES).optional(),
    category: zod.enum(FEEDBACK_CATEGORIES).optional(),
    rating: zod.coerce.number().int().min(1).max(5).optional(),
    user_id: zod.coerce.number().int().positive().optional(),
});

export const updateFeedbackStatusSchema = zod.object({
    status: zod.enum(FEEDBACK_STATUSES),
});

export const replyFeedbackSchema = zod.object({
    admin_reply: zod.string().trim().min(3, "Reply must be at least 3 characters").max(1000, "Reply must be at most 1000 characters"),
});

// Shape the FE expects: the author is joined in for the admin listing.
const authorSelect = { select: { id: true, name: true, email: true } };

// Turn zod issues into the { field, message } list the FE reads.
const toFieldIssues = (error: zod.ZodError) =>
    error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
    }));

// GET /feedback — admins see everything, members see only their own rows.
export const getAllFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const validation = feedbackQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: toFieldIssues(validation.error) });
    }

    const { page, limit, search, status, category, rating, user_id } = validation.data;
    const { skip, take } = getPagination(page, limit);
    const admin = isAdminRole(me.role);

    const where: any = {};

    // The scope is decided here from the token — never from a client flag,
    // so a member cannot page into someone else's feedback.
    if (admin) {
        if (user_id) where.user_id = user_id;
    } else {
        where.user_id = me.id;
    }

    if (status) where.status = status;
    if (category) where.category = category;
    if (rating) where.rating = rating;
    if (search) {
        where.OR = [{ subject: { contains: search } }, { message: { contains: search } }];
    }

    // Members already know who they are — only admins need the author joined.
    // Split rather than passing `include: undefined`: exactOptionalPropertyTypes
    // treats a present-but-undefined `include` as a type error.
    const [feedback, total] = await Promise.all([
        admin
            ? prisma.feedback.findMany({
                where,
                skip,
                take,
                orderBy: { id: "desc" },
                include: { user: authorSelect },
            })
            : prisma.feedback.findMany({
                where,
                skip,
                take,
                orderBy: { id: "desc" },
            }),
        prisma.feedback.count({ where }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: feedback, pagination: getPaginationMeta(total, page, limit) });
});

// GET /feedback/summary — admin overview cards. Must be registered before
// the /:id route or "summary" is parsed as an id.
export const getFeedbackSummary = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    if (!isAdminRole(me.role)) {
        throw new AppError("Forbidden", 403);
    }

    const [total, pending, aggregate, grouped] = await Promise.all([
        prisma.feedback.count(),
        prisma.feedback.count({ where: { status: "pending" } }),
        prisma.feedback.aggregate({ _avg: { rating: true } }),
        prisma.feedback.groupBy({ by: ["rating"], _count: { rating: true } }),
    ]);

    // Always send all five buckets so the FE can render them without holes.
    const by_rating: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
    for (const row of grouped) {
        by_rating[String(row.rating)] = row._count.rating;
    }

    return sendResponse(res, {
        status: 200, success: true, message: "Operation successful", data: {
            total,
            average_rating: aggregate._avg.rating ?? 0,
            pending,
            by_rating,
        },
    });
});

// GET /feedback/mine — a member's own feedback, no filters.
export const getMyFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const validation = feedbackQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: toFieldIssues(validation.error) });
    }

    const { page, limit } = validation.data;
    const { skip, take } = getPagination(page, limit);

    const [feedback, total] = await Promise.all([
        prisma.feedback.findMany({ where: { user_id: me.id }, skip, take, orderBy: { id: "desc" } }),
        prisma.feedback.count({ where: { user_id: me.id } }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: feedback, pagination: getPaginationMeta(total, page, limit) });
});

export const getParticularFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const { id } = req.params;

    const feedback = await prisma.feedback.findUnique({
        where: { id: Number(id) },
        include: { user: authorSelect },
    });

    if (!feedback) {
        throw new AppError("Feedback not found", 404);
    }

    // Members may only read their own.
    if (!isAdminRole(me.role) && feedback.user_id !== me.id) {
        throw new AppError("Forbidden", 403);
    }

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: feedback });
});

// POST /feedback — the author is always the caller, so user_id is never
// read from the body.
export const addNewFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const validation = createOrUpdateFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: toFieldIssues(validation.error) });
    }

    const { rating, category, subject, message } = validation.data;

    const feedback = await prisma.feedback.create({
        data: { user_id: me.id, rating, category, subject, message },
    });

    return sendResponse(res, { status: 201, success: true, message: "Feedback submitted successfully", data: feedback });
});

// PUT /feedback/:id — a member may revise their own feedback, but only
// while it is still pending (once an admin has actioned it, it is locked).
export const updateParticularFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const validation = createOrUpdateFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: toFieldIssues(validation.error) });
    }

    const { id } = req.params;
    const existing = await prisma.feedback.findUnique({ where: { id: Number(id) } });
    if (!existing) {
        throw new AppError("Record Not Found", 404);
    }

    if (existing.user_id !== me.id) {
        throw new AppError("You can only edit your own feedback", 403);
    }

    if (existing.status !== "pending") {
        throw new AppError("This feedback has already been reviewed and can no longer be edited", 409);
    }

    const { rating, category, subject, message } = validation.data;
    const updated = await prisma.feedback.update({
        where: { id: Number(id) },
        data: { rating, category, subject, message },
    });

    return sendResponse(res, { status: 200, success: true, message: "Feedback updated successfully", data: updated });
});

// DELETE /feedback/:id — admins can delete anything; members only their own
// pending feedback.
export const deleteFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const { id } = req.params;

    const existing = await prisma.feedback.findUnique({ where: { id: Number(id) } });
    if (!existing) {
        throw new AppError("Record Not Found", 404);
    }

    if (!isAdminRole(me.role)) {
        if (existing.user_id !== me.id) {
            throw new AppError("You can only delete your own feedback", 403);
        }
        if (existing.status !== "pending") {
            throw new AppError("This feedback has already been reviewed and can no longer be deleted", 409);
        }
    }

    await prisma.feedback.delete({ where: { id: Number(id) } });

    return sendResponse(res, { status: 200, success: true, message: "Feedback deleted successfully" });
});

// PATCH /feedback/:id/status — admin only.
export const updateFeedbackStatus = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    if (!isAdminRole(me.role)) {
        throw new AppError("Forbidden", 403);
    }

    const validation = updateFeedbackStatusSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: toFieldIssues(validation.error) });
    }

    const { id } = req.params;
    const { status } = validation.data;

    const existing = await prisma.feedback.findUnique({ where: { id: Number(id) } });
    if (!existing) {
        throw new AppError("Feedback not found", 404);
    }

    const updated = await prisma.feedback.update({
        where: { id: Number(id) },
        data: { status },
        include: { user: authorSelect },
    });

    return sendResponse(res, { status: 200, success: true, message: "Feedback status updated successfully", data: updated });
});

// PATCH /feedback/:id/reply — admin only. Replying moves a still-pending
// item to "reviewed" so the admin does not have to do it in two steps.
export const replyToFeedback = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    if (!isAdminRole(me.role)) {
        throw new AppError("Forbidden", 403);
    }

    const validation = replyFeedbackSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: toFieldIssues(validation.error) });
    }

    const { id } = req.params;
    const { admin_reply } = validation.data;

    const existing = await prisma.feedback.findUnique({ where: { id: Number(id) } });
    if (!existing) {
        throw new AppError("Feedback not found", 404);
    }

    const updated = await prisma.feedback.update({
        where: { id: Number(id) },
        data: {
            admin_reply,
            status: existing.status === "pending" ? "reviewed" : existing.status,
        },
        include: { user: authorSelect },
    });

    return sendResponse(res, { status: 200, success: true, message: "Reply sent successfully", data: updated });
});