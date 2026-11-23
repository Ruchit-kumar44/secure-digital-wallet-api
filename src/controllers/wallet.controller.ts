import type { Request, Response } from "express";
import { walletService } from "../services/wallet.service.js";

export async function getWallet(req: Request, res: Response){
    res.json(await walletService.getWallet(req.user!.id));
}