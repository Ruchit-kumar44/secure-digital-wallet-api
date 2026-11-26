import type { Request, Response } from "express";
import { p2ptransferService } from "../services/p2ptransfer.service.js";

export async function createTransfer(req: Request, res: Response){
  res.status(201).json(await(p2ptransferService.transfer(req.user!.id, req.body)));
}