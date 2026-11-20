import {z} from "zod";

export const registerSchema = z.object({
    name: z.string().trim().min(2).max(60),
    phone: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    password: z.string().min(8).max(128),
});

export const loginSchema = z.object({
    phone: z.string().regex(/^[6-9]\d{9}$/),
    password: z.string().min(1).max(128),
});

//schema for refresh token 
export const refreshSchema = z.object({ refreshToken: z.string().min(1) });

//schema for 6 digit PIN
export const setPinSchema = z.object({ pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits") });