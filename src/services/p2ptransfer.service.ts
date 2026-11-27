import { prisma } from "../config/prisma.js";
import type { TransferInput } from "../schemas/transfer.schema.js";
import { paiseToRupees, rupeesToPaise } from "../utils/amountConversion.js";
import { MAX_WALLET_BALANCE } from "../utils/amountLimit.js";
import { AppError } from "../utils/appError.js";
import { verifyPassword } from "../utils/password.js";
import { newReference } from "../utils/referenceId.js";
import  { withRetry } from "../utils/retry.js";

type MoveMoneyParams = {
  senderWalletId: string;
  receiverWalletId: string;
  amount: bigint;
  note?: string | null;
};



  
  async function moveMoney(p: MoveMoneyParams){
    if(p.senderWalletId === p.receiverWalletId){
      throw new AppError(400, "sender and receiver wallet must be different")
    }

    // 3.transatios helps in either full or rollback query
    return prisma.$transaction(async (tx) => {

      //prevent deadlock 
      const [first, second] = [p.senderWalletId, p.receiverWalletId].sort();
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${first} FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Wallet" WHERE id = ${second} FOR UPDATE`;

      const debited = await tx.wallet.updateMany({
        where: { id: p.senderWalletId, balance: { gte: p.amount } },
        data: { balance: { decrement: p.amount } },
      });
      //updateMany return count how many time executed if balance < amount count = 0
      if (debited.count === 0) throw new AppError(422, "Insufficient balance");

      //findUniqueAndThrow Fetch the updated row inside `current transaction tx` so we have `senderAfter.balance` for LedgerEntry
      const senderAfter = await tx.wallet.findUniqueOrThrow({
        where: { id: p.senderWalletId },
      });

      const receiverAfter = await tx.wallet.update({
        where: { id: p.receiverWalletId },
        data: { balance: { increment: p.amount } },
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
          amount: p.amount,
          fromWalletId: p.senderWalletId,
          toWalletId: p.receiverWalletId,
          note: p.note ?? null, //Converts `undefined` to `null` so Prisma + exactOptionalPropertyTypes dont conflict
        },
      });

      //create record in ledgerentry debit and credit
      await tx.ledgerEntry.createMany({
        data: [
          {
            transactionId: txn.id,
            walletId: p.senderWalletId,
            direction: "DEBIT",
            amount: p.amount,
            balanceAfter: senderAfter.balance,
          },
          {
            transactionId: txn.id,
            walletId: p.receiverWalletId,
            direction: "CREDIT",
            amount: p.amount,
            balanceAfter: receiverAfter.balance,
          },
        ],
      });

      return {
        reference: txn.reference,
        status: txn.status,
        amount: paiseToRupees(p.amount),
        // to: { name: receiver.name, upiId: receiver.upiId },
        balance: paiseToRupees(senderAfter.balance),
        createdAt: txn.createdAt,
      };
    }, { maxWait: 10_000, timeout: 15_000 }, );
    //{ maxWait, timeout }: Prisma interactive transactions give up after 2 seconds waiting for a free connection and 5 seconds of running time by default. Under 100 parallel transfers, some wait in line, so we allow 10 and 15 seconds. These are test-friendly values, not performance targets.
  };


  async function transfer(senderId: string, input: TransferInput) {
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

    
    const result = await withRetry(()=>
     moveMoney({
      senderWalletId: sender.wallet!.id,
      receiverWalletId: receiver.wallet!.id,
      amount: amount,
      note: input.note ?? null
    }),
    )

    return { ...result, to: { name: receiver.name, upiId: receiver.upiId } };
  }

  export const p2ptransferService = { transfer, moveMoney };
