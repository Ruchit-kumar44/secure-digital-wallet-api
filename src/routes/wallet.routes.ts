import { Router } from "express";
import { requireAuth } from "../middelware/auth.middelware.js";
import { getWallet } from "../controllers/wallet.controller.js";


export const walletRouter = Router();

walletRouter.get("/", requireAuth, getWallet);