import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { env } from "../config/env.js"

export function signAccessToken(user: { id: string; role: string }) {
  return jwt.sign({ role: user.role }, env.jwtAccessSecret, {
    subject: user.id,
    expiresIn: env.accessTtlSeconds,
    algorithm: "HS256",
  });
}

export function verifyAccessToken(token: string) {
  const payload = jwt.verify(token, env.jwtAccessSecret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  return { id: payload.sub as string, role: payload.role as string };
}

export const generateRefreshToken = () => crypto.randomBytes(48).toString("base64url");
export const hashToken = (t: string) => crypto.createHash("sha256").update(t).digest("hex");