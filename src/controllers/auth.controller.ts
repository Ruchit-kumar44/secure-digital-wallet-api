import type { Request, Response } from "express";
import { authService } from "../services/auth.service.js";

export async function register(req: Request, res: Response) {
  res.status(201).json(await authService.register(req.body));
}

export async function login(req: Request, res: Response){
    res.status(200).json( await authService.login(req.body))
}
export async function refresh(req: Request, res: Response){
    res.status(200).json( await authService.refresh(req.body))
}
export async function logOut(req: Request, res: Response){
    res.status(201).json( await authService.logout(req.body))
}