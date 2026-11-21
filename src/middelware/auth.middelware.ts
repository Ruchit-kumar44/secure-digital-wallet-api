import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../utils/token.js"
import { AppError } from "../utils/appError.js";

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new AppError(401, "Missing access token");

  let user;
  try {
    user = verifyAccessToken(header.slice(7));
  } catch {
    throw new AppError(401, "Invalid or expired access token");
  }
  req.user = user;
  next();
}