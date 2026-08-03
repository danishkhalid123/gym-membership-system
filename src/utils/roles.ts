// Matches the FE's isAdmin(): normalize the free-text role column so
// "Admin", "super_admin", "SUPER-ADMIN" etc. all count as admin.
export const isAdminRole = (role: string | undefined | null): boolean => {
    const normalized = role?.replace(/[\s_-]/g, "").toLowerCase();
    return normalized === "admin" || normalized === "superadmin";
};
