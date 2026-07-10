interface ApiResponse<T = unknown> {
    status: number;
    success: boolean;
    message: string | object;
    data?: T;
}

export const sendResponse = <T>(res: any, { status = 200, success = true, message = '', data }: ApiResponse<T>
) => {
    return res.status(status).json({ status, success, message, data, });
};