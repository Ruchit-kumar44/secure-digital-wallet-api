import { Router } from "express";
import { requireAuth } from "../middelware/auth.middelware.js";
import { getWallet, topUp } from "../controllers/wallet.controller.js";
import { Validate } from "../middelware/validate.middelware.js";
import { topUpSchema } from "../schemas/wallet.schema.js";


export const walletRouter = Router();

walletRouter.get("/", requireAuth, getWallet);
walletRouter.post("/topup", requireAuth, Validate(topUpSchema), topUp)