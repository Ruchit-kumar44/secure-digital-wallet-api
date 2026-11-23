import {z} from "zod";
import { MAX_TOPUP_PAISE, MIN_TOPUP_PAISE } from "../utils/amountLimit.js";


export const topUpSchema = z.object({
    body: z.object({
        amount: z.number().int().min(MIN_TOPUP_PAISE).max(MAX_TOPUP_PAISE),
        note: z.string().trim().max(100).optional(),
    }),
})

export type topUpInput = z.infer<typeof topUpSchema>["body"]