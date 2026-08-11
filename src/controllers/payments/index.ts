import Stripe from "stripe";
import zod from "zod";
import { prisma } from "../../config/db.ts";
import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { applyDiscount } from "../../utils/discount.ts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const checkoutSchema = zod.object({
    user_id: zod.number(),
    membership_id: zod.number(),
    discount_code: zod.string().trim().optional(),
});

export const createCheckoutSession = asyncHandler(async (req, res) => {
    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { user_id, membership_id, discount_code } = validation.data;

    const plan = await prisma.membership_plans.findUnique({ where: { id: membership_id } });
    if (!plan) throw new AppError("Membership id not found", 404);

    const user = await prisma.users.findUnique({ where: { id: user_id } });
    if (!user) throw new AppError("User id not found", 404);

    const breakdown = discount_code
        ? await applyDiscount(discount_code, Number(plan.price))
        : null;
    const amountToCharge = breakdown ? breakdown.final_price : Number(plan.price);

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [{
            price_data: {
                currency: "usd",
                product_data: {
                    name: plan.name,
                    description: breakdown
                        ? `${plan.description} (code ${breakdown.code} applied)`
                        : plan.description,
                },
                unit_amount: Math.round(amountToCharge * 100),
            },
            quantity: 1,
        }],
        metadata: {
            user_id: String(user_id),
            membership_id: String(membership_id),
            duration_days: String(plan.duration_days),
            discount_code: breakdown ? breakdown.code : "",
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


export const createUpgradeCheckoutSession = asyncHandler(async (req, res) => {
    const validation = checkoutSchema.safeParse(req.body);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { user_id, membership_id, discount_code } = validation.data;

    const subscription = await prisma.subscriptions.findFirst({
        where: { user_id, status: "active" },
        include: { membership_plan: true },
    });
    if (!subscription) throw new AppError("Active subscription not found", 404);

    const newPlan = await prisma.membership_plans.findUnique({ where: { id: membership_id } });
    if (!newPlan) throw new AppError("Membership not found", 404);

    if (Number(newPlan.price) <= Number(subscription.membership_plan.price)) {
        throw new AppError("Only upgrades are allowed", 400);
    }

    const user = await prisma.users.findUnique({ where: { id: user_id } });
    if (!user) throw new AppError("User id not found", 404);

    const today = new Date();
    const totalDays = Math.ceil(
        (subscription.end_date.getTime() - subscription.start_date.getTime()) / (1000 * 60 * 60 * 24)
    );
    const remainingDays = Math.max(
        0,
        Math.ceil((subscription.end_date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    );
    const remainingValue = (remainingDays / totalDays) * Number(subscription.membership_plan.price);
    const subtotal = Math.max(0, Number(newPlan.price) - remainingValue);

    const breakdown = discount_code
        ? await applyDiscount(discount_code, Number(subtotal.toFixed(2)))
        : null;
    const amountToPay = breakdown ? breakdown.final_price : subtotal;

    const session = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [{
            price_data: {
                currency: "usd", // keep in sync with createCheckoutSession
                product_data: {
                    name: `Upgrade to ${newPlan.name}`,
                    description: `Prorated upgrade from ${subscription.membership_plan.name}`,
                },
                unit_amount: Math.round(amountToPay * 100),
            },
            quantity: 1,
        }],
        metadata: {
            type: "upgrade",
            user_id: String(user_id),
            membership_id: String(membership_id),
            discount_code: breakdown ? breakdown.code : "",
        },
        success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}&type=upgrade`,
        cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
    });

    return sendResponse(res, { status: 200, success: true, message: "Upgrade checkout session created", data: { url: session.url } });
});

export const confirmUpgrade = asyncHandler(async (req, res) => {
    const { session_id } = req.body;
    if (!session_id) throw new AppError("session_id is required", 400);

    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status !== "paid") throw new AppError("Payment not completed", 400);
    // a normal purchase session must not be able to trigger a plan switch
    if (session.metadata?.type !== "upgrade") throw new AppError("Not an upgrade session", 400);

    const { user_id, membership_id } = session.metadata;

    const subscription = await prisma.subscriptions.findFirst({
        where: { user_id: Number(user_id), status: "active" },
    });
    if (!subscription) throw new AppError("Active subscription not found", 404);

    // idempotency: refreshing the success page must not re-run the upgrade
    if (subscription.membership_id === Number(membership_id)) {
        return sendResponse(res, { status: 200, success: true, message: "Membership already upgraded", data: subscription });
    }

    const updatedSubscription = await prisma.subscriptions.update({
        where: { id: subscription.id },
        data: { membership_id: Number(membership_id) },
    });

    return sendResponse(res, { status: 200, success: true, message: "Membership upgraded successfully", data: updatedSubscription });
});
