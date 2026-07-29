import { Server } from "socket.io";
import { registerMachineSocket } from "./machine-socket.ts";

let io: Server;

export const initializeSocket = (server: any) => {
    io = new Server(server, {
        cors: {
            origin: "http://localhost:3000",
            credentials: true,
        },
    });

    io.on("connection", (socket) => {
        console.log(`Client Connected: ${socket.id}`);

        registerMachineSocket(socket);

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