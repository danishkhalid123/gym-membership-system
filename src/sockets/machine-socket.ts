import { Socket } from "socket.io";

export const registerMachineSocket = (socket: Socket) => {
    socket.on("join-machines", () => {
        socket.join("machines");
        console.log(`${socket.id} joined machines`);
    });

    socket.on("leave-machines", () => {
        socket.leave("machines");
    });
};