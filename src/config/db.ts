import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";

interface MariaDbConfig {
    host: string;
    user: string;
    password: string;
    database: string;
    connectionLimit: number;
}

const adapterConfig: MariaDbConfig = {
    host: process.env.DATABASE_HOST!,
    user: process.env.DATABASE_USER!,
    password: process.env.DATABASE_PASSWORD!,
    database: process.env.DATABASE_NAME!,
    connectionLimit: 5,
};
const adapter = new PrismaMariaDb(adapterConfig);
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
    try {
        await prisma.$connect();
        console.log("Database connected successfully via Prisma");
    } catch (error) {
        console.error("Database connection failed", error);
        process.exit(1);
    }
}

const disconnectDB = async () => {
    try {
        await prisma.$disconnect();
        console.log("Database disconnected successfully via Prisma");
    } catch (error) {
        console.error("Database disconnection failed", error);
    }
}

export { prisma, connectDB, disconnectDB };