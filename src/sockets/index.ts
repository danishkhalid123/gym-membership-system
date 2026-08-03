import { Server } from "socket.io";
import { registerMachineSocket } from "./machine-socket.ts";
import { registerChatSocket } from "./chat-socket.ts";
import { getUserFromToken } from "../utils/get-user-from-token.ts";

let io: Server;

export const initializeSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            credentials: true,
        },
    });

    // Runs once per connecting client, before "connection" fires.
    // Rejects the connection entirely if the JWT is missing or invalid.
    io.use(async (socket, next) => {
        const user = await getUserFromToken(socket.handshake.auth?.token);
        if (!user) {
            return next(new Error("Unauthorized"));
        }
        socket.data.user = { id: user.id, name: user.name, role: user.role };
        next();
    });

    io.on("connection", (socket) => {
        const user = socket.data.user;
        console.log(`Client Connected: ${socket.id} (user ${user.id})`);

        // Personal room: lets the server reach this user on any of their
        // open tabs/devices — used for "new message" notifications.
        socket.join(`user:${user.id}`);

        registerMachineSocket(socket);
        registerChatSocket(socket);

        socket.on("disconnect", () => {
            console.log(`Client Disconnected: ${socket.id}`);
        });
    });

    return io;
};

export const getIO = () => {
    if (!io) {
        throw new Error("Socket.IO not initialized");
    }

    return io;
};
