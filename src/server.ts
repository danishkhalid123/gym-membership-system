import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import dotenv from "dotenv";
import cookieParser from 'cookie-parser';
import authRouter from './routes/auth/index.ts';

import { connectDB } from "./config/db.ts";
import { errorHandler } from './middlewares/error-handler.ts';
import profileRouter from './routes/profile/index.ts';
import membershipPlansRouter from './routes/membership-plans/index.ts';
import subscriptionsRouter from './routes/subscriptions/index.ts';
import attendanceRouter from './routes/attendance/index.ts';
import usersRouter from './routes/users/index.ts';
import "./cron/subscriptionReminder.ts";
import machineRouter from './routes/machine/index.ts';
import http from "http";
import { initializeSocket } from "./sockets/index.ts";

dotenv.config();
const app = express();
const PORT = 3000;
app.use(express.json());
connectDB();

//Helmet
app.use(helmet());

//Morgan
app.use(morgan('dev')) //FOR DEV
// app.use(morgan(":method :url :status :response-time ms")) //FOR PRODUCTION

//CORS
app.use(cors({
    origin: 'http://localhost:3000',
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
}))

//ASSETS IN EXPRESS
app.use(express.static('public'));

//Cookies
app.use(cookieParser());

//Routes
app.use('/auth', authRouter);
app.use('/users', usersRouter);
app.use('/', profileRouter);
app.use("/membership-plans", membershipPlansRouter);
app.use("/subscriptions", subscriptionsRouter);
app.use("/attendance", attendanceRouter);
app.use("/machines", machineRouter);

//Register Error middleware
app.use(errorHandler);

// Create HTTP Server
const server = http.createServer(app);

// Initialize Socket.IO
initializeSocket(server);

// Start Server
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});