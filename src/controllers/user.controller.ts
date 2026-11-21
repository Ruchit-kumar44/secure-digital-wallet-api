import type { Request, Response } from "express";
import { userServices } from "../services/user.service.js";

export async function getMe(req: Request, res: Response) {
  res.json(await userServices.getProfile(req.user!.id));
}

export async function setPin(req: Request, res: Response) {
  await userServices.setPin(req.user!.id, req.body.pin);
  res.status(204).send();
}