import z from "zod";
import { MAX_TRANSFER_RUPEES, MIN_TRANSFER_RUPEES } from "../utils/amountLimit.js";

export const transferSchema = z.object({
    body: z.object({
        to: z.string().trim().min(10).max(60),
        amount: z.number().int().min(MIN_TRANSFER_RUPEES).max(MAX_TRANSFER_RUPEES);
        pin: z.string().regex(/^\d{6}$/, "PIN must be 6 digits"),
        note: z.string().trim().max(100).optional(),
    })
})

export type TransferInput = z.infer<typeof transferSchema>["body"];