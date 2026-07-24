export const getPagination = (page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    return {
        skip,
        take: limit,
        page,
        limit,
    };
};

export const getPaginationMeta = (total: number, page: number, limit: number) => {
    const totalPages = Math.ceil(total / limit);

    return {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
    };
};