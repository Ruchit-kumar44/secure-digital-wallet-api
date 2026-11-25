import {z} from "zod";
import { MAX_TOPUP_RUPEES, MIN_TOPUP_RUPEES } from "../utils/amountLimit.js";


export const topUpSchema = z.object({
    body: z.object({
        amount: z.number().int().min(MIN_TOPUP_RUPEES).max(MAX_TOPUP_RUPEES),
        note: z.string().trim().max(100).optional(),
    }),
})

export type topUpInput = z.infer<typeof topUpSchema>["body"]