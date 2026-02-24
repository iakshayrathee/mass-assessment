import bcrypt from "bcrypt";
import { userRepository } from "../repositories/user.repository";
import { signToken } from "../utils/jwt";
import { AuthResponse } from "../types";

export const authService = {
    async login(email: string, password: string): Promise<AuthResponse> {
        const user = await userRepository.findByEmail(email);
        if (!user) {
            throw new Error("Invalid email or password");
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
            throw new Error("Invalid email or password");
        }

        // Determine user's display name from profile
        let name = email;
        if (user.educatorProfile) name = user.educatorProfile.name;
        else if (user.schoolViewerProfile) name = user.schoolViewerProfile.name;
        else if (user.centerAdminProfile) name = user.centerAdminProfile.name;

        const token = signToken({
            userId: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                name,
            },
        };
    },

    async getProfile(userId: string) {
        const user = await userRepository.findById(userId);
        if (!user) throw new Error("User not found");

        let name = user.email;
        let profileData: any = {};

        if (user.educatorProfile) {
            name = user.educatorProfile.name;
            profileData = {
                profileId: user.educatorProfile.id,
                schoolId: user.educatorProfile.schoolId,
                centerId: user.educatorProfile.centerId,
            };
        } else if (user.schoolViewerProfile) {
            name = user.schoolViewerProfile.name;
            profileData = {
                profileId: user.schoolViewerProfile.id,
                schoolId: user.schoolViewerProfile.schoolId,
            };
        } else if (user.centerAdminProfile) {
            name = user.centerAdminProfile.name;
            profileData = {
                profileId: user.centerAdminProfile.id,
                centerId: user.centerAdminProfile.centerId,
            };
        }

        return {
            id: user.id,
            email: user.email,
            role: user.role,
            name,
            ...profileData,
        };
    },
};
