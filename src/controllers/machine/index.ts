import { sendResponse } from "../../utils/api-response.ts";
import { AppError } from "../../utils/app-errors.ts";
import { prisma } from "../../config/db.ts";
import zod from "zod";
import { asyncHandler } from "../../middlewares/async-handler.ts";
import { getPagination, getPaginationMeta } from "../../utils/pagination.ts";

export const createOrUpdateMachineSchema = zod.object({
    name: zod.string().trim().min(1, "Name is required").min(3, "Name must be at least 3 characters"),
    location: zod.string().trim().min(1, "Location is required").min(3, "Location must be at least 3 characters"),
    status: zod.string().trim().min(1, "Status is required").min(3, "Status must be at least 3 characters"),
});

export const machineQuerySchema = zod.object({
    page: zod.coerce.number().min(1).default(1),
    limit: zod.coerce.number().min(1).max(100).default(10),
    search: zod.string().optional().default(""),
});

export const getAllMachines = asyncHandler(async (req, res) => {
    const validation = machineQuerySchema.safeParse(req.query);
    if (!validation.success) {
        return sendResponse(res, { status: 400, success: false, message: "Validation Error", data: validation.error.issues });
    }
    const { page, limit, search } = validation.data;
    const { skip, take } = getPagination(page, limit);

    const searchFilter = search ?
        {
            OR: [{ name: { contains: search } }],
        }
        : {};

    const [machines, total] = await Promise.all([
        prisma.machine.findMany({
            where: searchFilter,
            skip,
            take,
            orderBy: {
                id: "desc",
            },
        }),
        prisma.machine.count({
            where: searchFilter,
        }),
    ]);

    return sendResponse(res, { status: 200, success: true, message: "Operation successful", data: machines, pagination: getPaginationMeta(total, page, limit), });
});

export const getParticularMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const getMachine = await prisma.machine.findUnique({
        where: { id: Number(id) }
    })
    if (!getMachine) {
        throw new AppError("Machine not found", 404)
    }
    return sendResponse(res, { status: 200, success: true, message: "Operation successfull", data: getMachine });
});

export const addNewMachine = asyncHandler(async (req, res) => {
    const validation = createOrUpdateMachineSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }


    const { name, location, status } = req.body;
    const addMachine = await prisma.machine.create({
        data: {
            name: name,
            location: location,
            status: status,
        }
    });
    return sendResponse(res, { status: 201, success: true, message: 'Machine created successfully', data: addMachine })
});

export const updateParticularMachine = asyncHandler(async (req, res) => {
    const validation = createOrUpdateMachineSchema.safeParse(req.body);

    if (!validation.success) {
        return sendResponse(res, {
            status: 400, success: false, message: "Validation Error", data: validation.error.issues.map((issue) => ({
                field: issue.path.join("."),
                message: issue.message,
            })),
        });
    }
    const { id } = req.params;
    const { name, location, status } = req.body;
    const findMachine = await prisma.machine.findUnique({
        where: { id: Number(id) }
    });

    if (!findMachine) {
        throw new AppError("Record Not Found", 404);
    }

    const updateMachine = await prisma.machine.update({
        data: {
            name: name,
            location: location,
            status: status,
        },
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Machine updated successfully', data: updateMachine })
});

export const deleteMachine = asyncHandler(async (req, res) => {
    const { id } = req.params;

    const findMachine = await prisma.machine.findUnique({
        where: { id: Number(id) }
    });
    if (!findMachine) {
        throw new AppError("Record Not Found", 404);
    }

    const deleteMachine = await prisma.machine.delete({
        where: { id: Number(id) }
    });
    return sendResponse(res, { status: 200, success: true, message: 'Machine deleted successfully' })
});