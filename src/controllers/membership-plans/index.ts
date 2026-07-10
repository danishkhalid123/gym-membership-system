import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";

export const createOrUpdateMembershipPlanSchema = zod.object({
    name: zod.string().trim().min(1, "Name is required").min(3, "Name must be at least 3 characters"),
    price: zod.number().positive("Price must be greater than 0"),
    duration_days: zod.number().positive("Duration must be greater than 0").int("Duration must be an integer"),
    description: zod.string().trim(),
});

export const getAllMembershipPlans = async (req: any, res: any) => {
    try {
        const getMembershipPlans = await prisma.membership_plans.findMany();
        return sendResponse(res, { status: 200, success: true, message: "Operational successfull", data: getMembershipPlans })
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Something went wrong", 400);
    }
}

export const getParticularMembershipPlan = async (req: any, res: any) => {
    try {
        const { id } = req.params;
        const getMembershipPlan = await prisma.membership_plans.findUnique({
            where: { id: Number(id) }
        })
        if (!getMembershipPlan) {
            throw new AppError("Membership plan not found", 404)
        }
        return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getMembershipPlan });
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Something went wrong", 400);
    }
}

export const addNewMembershipPlan = async (req: any, res: any) => {
    try {
        const validation = createOrUpdateMembershipPlanSchema.safeParse(req.body);

        if (!validation.success) {
            return sendResponse(res, {
                status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }


        const { name, price, duration_days, description } = req.body;
        const addMembershipPlan = await prisma.membership_plans.create({
            data: {
                name: name,
                price: price,
                duration_days: duration_days,
                description: description
            }
        });
        return sendResponse(res, { status: 201, success: true, message: 'Membership plan created successfully', data: addMembershipPlan })
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Something went wrong", 400);
    }
}

export const updateParticularMembershipPlan = async (req: any, res: any) => {
    try {
        const validation = createOrUpdateMembershipPlanSchema.safeParse(req.body);

        if (!validation.success) {
            return sendResponse(res, {
                status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                    field: issue.path.join("."),
                    message: issue.message,
                })),
            });
        }
        const { id } = req.params;
        const { name, price, duration_days, description } = req.body;
        const findMembershipPlan = await prisma.membership_plans.findUnique({
            where: { id: Number(id) }
        });

        if (!findMembershipPlan) {
            throw new AppError("Record Not Found", 404);
        }

        const updateMembershipPlan = await prisma.membership_plans.update({
            data: {
                name: name,
                price: price,
                duration_days: duration_days,
                description: description
            },
            where: { id: Number(id) }
        });
        return sendResponse(res, { status: 200, success: true, message: 'Membership plan updated successfully', data: updateMembershipPlan })
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Something went wrong", 400);

    }
}


export const deleteMembershipPlan = async (req: any, res: any) => {
    const { id } = req.params;
    try {

        const findMembershipPlan = await prisma.membership_plans.findUnique({
            where: { id: Number(id) }
        });
        if (!findMembershipPlan) {
            throw new AppError("Record Not Found", 404);
        }

        const deleteMembershipPlan = await prisma.membership_plans.delete({
            where: { id: Number(id) }
        });
        return sendResponse(res, { status: 200, success: true, message: 'Membership plan deleted successfully' })

    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError("Something went wrong", 400);
    }
}