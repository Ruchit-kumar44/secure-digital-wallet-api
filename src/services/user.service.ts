import { use } from "react";
import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/appError.js";
import { hashPassword } from "../utils/password.js";
import { paiseToRupees } from "../utils/amountConversion.js";

export const userServices = {
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { wallet: true },
    });
    if (!user || !user.wallet) {
      throw new AppError(404, "User not found");
    }
    return {
      id: user.id,
      name: user.name,
      phone: user.phone,
      upiId: user.upiId,
      role: user.role,
      hasPin: !!user.pinHash,
      wallet: {
        id: user.wallet.id,
        balance: paiseToRupees(user.wallet.balance),
        currency: user.wallet.currency,
      },
    };
  },

  async setPin(userId: string, pin: string){
    const user = await prisma.user.findUnique({where: {id: userId}});
    if(!user){ throw new AppError(404, "user not found")}
    if (user.pinHash) throw new AppError(409, "PIN already set");
    await prisma.user.update({ where: { id: userId }, data: { pinHash: await hashPassword(pin) } });
    //here hashPassword logic is utilised for hashing Pin
  }
};

