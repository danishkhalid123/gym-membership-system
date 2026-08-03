import { Socket } from "socket.io";
import zod from "zod";
import { prisma } from "../config/db.ts";
import { getIO } from "./index.ts";

const sendMessageSchema = zod.object({
    conversationId: zod.coerce.number().int().positive(),
    content: zod.string().trim().min(1).max(1000),
});

const findMyConversation = (conversationId: number, userId: number) =>
    prisma.conversations.findFirst({
        where: {
            id: conversationId,
            OR: [{ user_id: userId }, { admin_id: userId }],
        },
    });

export const registerChatSocket = (socket: Socket) => {
    const me = socket.data.user;

    socket.on("chat:join", async (conversationId: number, ack?: (ok: boolean) => void) => {
        const conversation = await findMyConversation(Number(conversationId), me.id);
        if (!conversation) {
            ack?.(false);
            return;
        }
        socket.join(`conversation:${conversation.id}`);
        ack?.(true);
    });

    socket.on("chat:leave", (conversationId: number) => {
        socket.leave(`conversation:${Number(conversationId)}`);
    });

    socket.on("chat:send", async (payload: unknown, ack?: (result: any) => void) => {
        const validation = sendMessageSchema.safeParse(payload);
        if (!validation.success) {
            ack?.({ ok: false, error: "Invalid message" });
            return;
        }
        const { conversationId, content } = validation.data;

        const conversation = await findMyConversation(conversationId, me.id);
        if (!conversation) {
            ack?.({ ok: false, error: "Conversation not found" });
            return;
        }

        const message = await prisma.messages.create({
            data: {
                conversation_id: conversationId,
                sender_id: me.id,
                content,
            },
        });

        await prisma.conversations.update({
            where: { id: conversationId },
            data: { updated_at: new Date() },
        });

        const io = getIO();

        io.to(`conversation:${conversationId}`).emit("chat:message", message);

        const otherUserId =
            conversation.user_id === me.id ? conversation.admin_id : conversation.user_id;
        io.to(`user:${otherUserId}`).emit("chat:notify", {
            conversationId,
            message,
        });

        ack?.({ ok: true, message });
    });

    socket.on("chat:typing", async (conversationId: number, isTyping: boolean) => {
        const conversation = await findMyConversation(Number(conversationId), me.id);
        if (!conversation) return;
        socket.to(`conversation:${conversation.id}`).emit("chat:typing", {
            conversationId: conversation.id,
            userId: me.id,
            isTyping,
        });
    });
};
