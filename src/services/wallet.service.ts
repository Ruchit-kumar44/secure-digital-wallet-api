import { prisma } from "../config/prisma.js";
import type { topUpInput } from "../schemas/wallet-schema.js";
import { paiseToRupees, rupeesToPaise } from "../utils/amountConversion.js";
import {MAX_WALLET_BALANCE } from "../utils/amountLimit.js";
import { AppError } from "../utils/appError.js";
import { newReference } from "../utils/referenceId.js";

export const walletService = {
  async getWallet(userId: string) {
    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId },
    });
    if (!wallet) {
      throw new AppError(404, "Wallet not found");
    }
    return {
      id: wallet.id,
      balance: paiseToRupees(wallet.balance),
      currency: wallet.currency,
    };
  },

  async topUp(userId: string, input: topUpInput) {
    //convert amount to bigInt
    const amount = rupeesToPaise(input.amount);

    const wallet = await prisma.wallet.findUnique({
      where: { userId: userId },
    });
    if (!wallet) throw new AppError(404, "Wallet not found");

    //find system wallet to add money(topup) from this to your account
    const system = await prisma.wallet.findFirst({ where: { type: "SYSTEM" } });
    if (!system)
      throw new AppError(500, "System wallet missing, run npm run seed");

    //use transactions for this as we want either full or no transaction happen
    return prisma.$transaction(async (tx) => {
      const txn = await tx.transaction.create({
        data: {
          reference: newReference(),
          type: "TOPUP",
          status: "SUCCESS",
          amount,
          fromWalletId: system.id,
          toWalletId: wallet.id,
          note: input.note ?? null, //Converts `undefined` to `null` so Prisma + exactOptionalPropertyTypes dont conflict
        },
      });

      //decrease topup amount from system wallet 
      const systemWalletAfter = await tx.wallet.update({
        where: {id: system.id},
        data: {balance: { decrement: amount }},
      });

      //increase amount in wallet in which topup happen
      const userWalletAfter = await tx.wallet.update({
        where: {id: wallet.id},
        data: {balance: {increment: amount}}
      });

      if(userWalletAfter.balance > BigInt(MAX_WALLET_BALANCE)){
        throw new AppError(422, "Wallet balance limit exceeded");
      }

      // create entry into ledgerentry table
      await tx.ledgerEntry.createMany({
        data: [
            {transactionId: txn.id, walletId: system.id, direction: "DEBIT", amount, balanceAfter: systemWalletAfter.balance},
            {transactionId: txn.id, walletId: wallet.id, direction: 'CREDIT', amount, balanceAfter: userWalletAfter.balance}
        ]
      });

       return {
        reference: txn.reference,
        type: txn.type,
        status: txn.status,
        amount: paiseToRupees(amount),
        balance: paiseToRupees(userWalletAfter.balance),
        createdAt: txn.createdAt,
      };
    });
  },
};
