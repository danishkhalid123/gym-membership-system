import { prisma } from "../config/db.ts";
import { AppError } from "./app-errors.ts";

export interface DiscountBreakdown {
    code: string;
    type: string;
    value: number;
    original_price: number;
    discount_amount: number;
    final_price: number;
}

export const applyDiscount = async (
    rawCode: string,
    originalPrice: number
): Promise<DiscountBreakdown> => {
    const code = rawCode.trim().toUpperCase();

    const discount = await prisma.discounts.findUnique({ where: { code } });
    if (!discount) throw new AppError("Invalid discount code", 404);
    if (discount.status !== "active") throw new AppError("This discount code is no longer active", 400);

    const discountAmount =
        discount.type === "Percent"
            ? (originalPrice * discount.value) / 100
            : discount.value;

    const cappedDiscount = Math.min(discountAmount, originalPrice);
    const finalPrice = Math.round((originalPrice - cappedDiscount) * 100) / 100;

    return {
        code: discount.code,
        type: discount.type,
        value: discount.value,
        original_price: originalPrice,
        discount_amount: Math.round(cappedDiscount * 100) / 100,
        final_price: finalPrice,
    };
};
