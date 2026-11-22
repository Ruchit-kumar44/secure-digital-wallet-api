import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { DUMMY_HASH, hashPassword, verifyPassword } from "../utils/password.js";
import { generateRefreshToken, hashToken, signAccessToken } from "../utils/token.js";
import { AppError } from "../utils/appError.js";
import type { loginInput, refreshTokenInput, registerInput } from "../schemas/auth.schema.js";

async function issueTokens(user: { id: string; role: string }) {
  const refreshToken = generateRefreshToken();
  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + env.refreshTtlDays * 24 * 60 * 60 * 1000),
    },
  });
  return { accessToken: signAccessToken(user), refreshToken, expiresIn: env.accessTtlSeconds };
}

export const authService = {
  async register(input: registerInput) {
    const passwordHash = await hashPassword(input.password);
    try {
      const user = await prisma.user.create({
        data: {
          name: input.name,
          phone: input.phone,
          upiId: `${input.phone}@paywallet`,
          passwordHash: passwordHash,
          wallet: { create: {} },
        },
      });
      return { id: user.id, name: user.name, phone: user.phone, upiId: user.upiId };
    } catch (e) {
      if ((e as { code?: string }).code === "P2002") throw new AppError(409, "Phone already registered");
      throw e;
    }
  },

  async login(input: loginInput) {
    const user = await prisma.user.findUnique({ where: { phone: input.phone } });
    const valid = await verifyPassword(input.password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !valid) throw new AppError(401, "Invalid phone or password");
    return issueTokens(user);
  },

  async refresh(input: refreshTokenInput) {
    const stored = await prisma.refreshToken.findUnique({ where: { tokenHash: hashToken(input.refreshToken) } });
    if (!stored) throw new AppError(401, "Invalid refresh token");

    if (stored.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new AppError(401, "Refresh token reuse detected, please log in again");
    }
    if (stored.expiresAt < new Date()) throw new AppError(401, "Refresh token expired");

    await prisma.refreshToken.update({ where: { id: stored.id }, data: { revokedAt: new Date() } });
    const user = await prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user) throw new AppError(401, "Invalid refresh token");
    return issueTokens(user);
  },

  async logout(input: refreshTokenInput) {
    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(input.refreshToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  },
};