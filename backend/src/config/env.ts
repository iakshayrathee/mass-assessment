import dotenv from "dotenv";
dotenv.config();

export const env = {
    PORT: parseInt(process.env.PORT || "5000", 10),
    DATABASE_URL: process.env.DATABASE_URL || "",
    JWT_SECRET: process.env.JWT_SECRET || "change-me",
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
    CORS_ORIGIN: process.env.CORS_ORIGIN || "http://localhost:3000",
};
