import zod from "zod";
import { prisma } from "../../config/db.ts";
import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";
import { isAdminRole } from "../../utils/roles.ts";

const openConversationSchema = zod.object({
    otherUserId: zod.coerce.number().int().positive(),
});

const messagesQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(30),
});

// GET /chat/conversations — my conversations, newest activity first
export const getMyConversations = asyncHandler(async (req, res) => {
    const me = (req as any).user;

    const conversations = await prisma.conversations.findMany({
        where: {
            OR: [{ user_id: me.id }, { admin_id: me.id }],
        },
        include: {
            messages: {
                orderBy: { created_at: "desc" },
                take: 1,
                select: { id: true, sender_id: true, content: true, created_at: true },
            },
        },
        orderBy: { updated_at: "desc" },
    });

    // No users relation on the schema, so fetch "the other person" for all
    // conversations in one query.
    const otherIds = conversations.map((c) => (c.user_id === me.id ? c.admin_id : c.user_id));
    const otherUsers = await prisma.users.findMany({
        where: { id: { in: otherIds } },
        select: { id: true, name: true, role: true },
    });
    const usersById = new Map(otherUsers.map((u) => [u.id, u]));

    const data = conversations.map((c) => ({
        id: c.id,
        otherUser: usersById.get(c.user_id === me.id ? c.admin_id : c.user_id) ?? null,
        lastMessage: c.messages[0] ?? null,
        updated_at: c.updated_at,
    }));

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data });
});

// POST /chat/conversations — open (find or create) a chat with another user
export const openConversation = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const validation = openConversationSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }

    const { otherUserId } = validation.data;
    if (otherUserId === me.id) {
        throw new AppError("You cannot chat with yourself", 400);
    }

    const otherUser = await prisma.users.findUnique({ where: { id: otherUserId } });
    if (!otherUser) {
        throw new AppError("User not found", 404);
    }

    const meAdmin = isAdminRole(me.role);
    const otherAdmin = isAdminRole(otherUser.role);

    // Members can only chat with gym staff.
    if (!meAdmin && !otherAdmin) {
        throw new AppError("You can only chat with gym staff", 403);
    }

    // Member goes in user_id, staff in admin_id. When two admins chat,
    // the smaller id takes the user_id slot so the pair is stored one way.
    let userId: number;
    let adminId: number;
    if (!meAdmin) {
        userId = me.id;
        adminId = otherUserId;
    } else if (!otherAdmin) {
        userId = otherUserId;
        adminId = me.id;
    } else {
        [userId, adminId] = me.id < otherUserId ? [me.id, otherUserId] : [otherUserId, me.id];
    }

    const conversation = await prisma.conversations.upsert({
        where: {
            user_id_admin_id: { user_id: userId, admin_id: adminId },
        },
        update: {},
        create: { user_id: userId, admin_id: adminId },
    });

    return sendResponse(res, {
        status: 200,
        success: true,
        message: "Operation successful",
        data: {
            id: conversation.id,
            otherUser: { id: otherUser.id, name: otherUser.name, role: otherUser.role },
        },
    });
});

// GET /chat/conversations/:id/messages — paginated history, members only
export const getMessages = asyncHandler(async (req, res) => {
    const me = (req as any).user;
    const conversationId = Number(req.params.id);

    // Same guard as the socket: if you're not in it, it doesn't exist.
    const conversation = await prisma.conversations.findFirst({
        where: {
            id: conversationId,
            OR: [{ user_id: me.id }, { admin_id: me.id }],
        },
    });
    if (!conversation) {
        throw new AppError("Conversation not found", 404);
    }

    const { page, limit } = messagesQuerySchema.parse(req.query);
    const { skip, take } = getPagination(page, limit);

    const [messages, total] = await Promise.all([
        prisma.messages.findMany({
            where: { conversation_id: conversationId },
            orderBy: { created_at: "desc" }, // newest first, so page 1 = latest
            skip,
            take,
        }),
        prisma.messages.count({ where: { conversation_id: conversationId } }),
    ]);

    return sendResponse(res, {
        status: 200,
        success: true,
        message: "Operation successful",
        data: messages.reverse(), // oldest-first within the page, ready to render
        pagination: getPaginationMeta(total, page, limit),
    });
});
