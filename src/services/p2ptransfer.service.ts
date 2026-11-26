import { prisma } from "../config/prisma.js";
import type { TransferInput } from "../schemas/transfer.schema.js";
import { paiseToRupees, rupeesToPaise } from "../utils/amountConversion.js";
import { MAX_WALLET_BALANCE } from "../utils/amountLimit.js";
import { AppError } from "../utils/appError.js";
import { verifyPassword } from "../utils/password.js";
import { newReference } from "../utils/referenceId.js";

export const p2ptransferService = {
  async transfer(senderId: string, input: TransferInput) {
    //rupees to paise conversion
    const amount = rupeesToPaise(input.amount);

    // 1. Sender checks, done BEFORE any transaction
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      include: { wallet: true },
    });
    if (!sender || !sender.wallet) throw new AppError(404, "Sender not found");
    if (!sender.pinHash) throw new AppError(403, "Set a transaction PIN first");
    //here verfiyPassword is utilised to verify pinHash
    if (!(await verifyPassword(input.pin, sender.pinHash)))
      throw new AppError(403, "Incorrect PIN");

    //find reciever by upi id or phone number
    const receiver = await prisma.user.findUnique({
      where: input.to.includes("@")
        ? { upiId: input.to.toLowerCase() }
        : { phone: input.to },
      include: { wallet: true },
    });
    if (!receiver || !receiver.wallet)
      throw new AppError(404, "Recipient not found");
    if (receiver.id === sender.id)
      throw new AppError(400, "You cannot send money to yourself");

    const senderWalletId = sender.wallet.id;
    const receiverWalletId = receiver.wallet.id;

    // 3.transatios helps in either full or rollback query
    return prisma.$transaction(async (tx) => {
      const debited = await tx.wallet.updateMany({
        where: { id: senderWalletId, balance: { gte: amount } },
        data: { balance: { decrement: amount } },
      });
      //updateMany return count how many time executed if balance < amount count = 0
      if (debited.count === 0) throw new AppError(422, "Insufficient balance");

      //Fetch the updated row inside `current transaction tx` so we have `senderAfter.balance` for LedgerEntry
      const senderAfter = await tx.wallet.findUniqueOrThrow({
        where: { id: senderWalletId },
      });

      const receiverAfter = await tx.wallet.update({
        where: { id: receiverWalletId },
        data: { balance: { increment: amount } },
      });
      //check total balance
      if (receiverAfter.balance > BigInt(MAX_WALLET_BALANCE)) {
        throw new AppError(422, "Recipient cannot receive this amount");
      }

      //create transaction record
      const txn = await tx.transaction.create({
        data: {
          reference: newReference(),
          type: "TRANSFER",
          status: "SUCCESS",
          amount,
          fromWalletId: senderWalletId,
          toWalletId: receiverWalletId,
          note: input.note ?? null, //Converts `undefined` to `null` so Prisma + exactOptionalPropertyTypes dont conflict
        },
      });

      //create record in ledgerentry debit and credit
      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: txn.id,
            walletId: senderWalletId,
            direction: "DEBIT",
            amount,
            balanceAfter: senderAfter.balance,
          },
          {
            transactionId: txn.id,
            walletId: receiverWalletId,
            direction: "CREDIT",
            amount,
            balanceAfter: receiverAfter.balance,
          },
        ],
      });

      return {
        reference: txn.reference,
        status: txn.status,
        amount: paiseToRupees(amount),
        to: { name: receiver.name, upiId: receiver.upiId },
        balance: paiseToRupees(senderAfter.balance),
        createdAt: txn.createdAt,
      };
    });
  },
};
