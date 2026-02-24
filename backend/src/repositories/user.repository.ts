import prisma from "../config/db";
import { User, UserRole } from "@prisma/client";

export const userRepository = {
    async findByEmail(email: string) {
        return prisma.user.findUnique({
            where: { email },
            include: {
                educatorProfile: true,
                schoolViewerProfile: true,
                centerAdminProfile: true,
            },
        });
    },

    async findById(id: string) {
        return prisma.user.findUnique({
            where: { id },
            include: {
                educatorProfile: true,
                schoolViewerProfile: true,
                centerAdminProfile: true,
            },
        });
    },

    async create(data: {
        email: string;
        passwordHash: string;
        role: UserRole;
    }) {
        return prisma.user.create({ data });
    },
};
