import Stripe from "stripe";
import zod from "zod";
import { prisma } from "../../config/db.ts";
import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { asyncHandler } from "../../middlewares/async-handler.ts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const checkoutSchema = zod.object({
    user_id: zod.number(),
    membership_id: zod.number(),
});

export const createCheckoutSession = asyncHandler(async (req, res) => {
    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { user_id, membership_id } = validation.data;

    const plan = await prisma.membership_plans.findUnique({ where: { id: membership_id } });
    if (!plan) throw new AppError("Membership id not found", 404);

    const user = await prisma.users.findUnique({ where: { id: user_id } });
    if (!user) throw new AppError("User id not found", 404);

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [{
            price_data: {
                currency: "usd", // adjust to your currency
                product_data: { name: plan.name, description: plan.description },
                unit_amount: plan.price * 100, // Stripe uses the smallest unit (cents)
            },
            quantity: 1,
        }],
        metadata: {
            user_id: String(user_id),
            membership_id: String(membership_id),
            duration_days: String(plan.duration_days),
        },
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    return sendResponse(res, { status: 200, success: true, message: "Checkout session created", data: { url: session.url } });
});

export const confirmPayment = asyncHandler(async (req, res) => {
    const { session_id } = req.body;
    if (!session_id) throw new AppError("session_id is required", 400);

    // ask Stripe directly — the client can't fake this
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
        throw new AppError("Payment not completed", 400);
    }

    const { user_id, membership_id, duration_days } = session.metadata!;

    // idempotency: refreshing the success page must not create a duplicate
    const existing = await prisma.subscriptions.findFirst({
        where: { user_id: Number(user_id), status: "active" },
    });
    if (existing) {
        return sendResponse(res, { status: 200, success: true, message: "Subscription already active", data: existing });
    }

    const start = new Date();
    const end = new Date(start.getTime() + Number(duration_days) * 24 * 60 * 60 * 1000);

    const subscription = await prisma.subscriptions.create({
        data: {
            user_id: Number(user_id),
            membership_id: Number(membership_id),
            start_date: start,
            end_date: end,
            status: "active",
        },
    });

    return sendResponse(res, { status: 201, success: true, message: "Subscription created successfully", data: subscription });
});
