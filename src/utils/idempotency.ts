import { pick } from "zod/mini";
import { prisma } from "../config/prisma.js";
import { createHash, hash } from "node:crypto";
import { AppError } from "./appError.js";

const TTL_MS = 24 * 60 * 60 * 1000; //24hr expire time of idempotencyKey in ms

// DbClient = Pick<typeof prisma, "idempotencyKey"> lets claimKey and completeKey accept either the normal client or the transaction client tx. That is how they run inside a transaction.
type DbClient = Pick<typeof prisma, "idempotencyKey">;

export type IdempotencyContext =  {
  userId: string;
  key: string;
  endpoint: string;
  requestHash: string;
}

export function makeContext(
  userId: string,
  key: string,
  endpoint: string,
  fingerPrint: object,
): IdempotencyContext{
    const requestHash = createHash("sha256")
     .update(JSON.stringify({endpoint, ...fingerPrint}))
     .digest("hex")

    return { userId, key, endpoint, requestHash };
}

export async function findReplay(ctx: IdempotencyContext): Promise<Record<string, unknown> | null>{
   const existing = await prisma.idempotencyKey.findUnique({where: {userId_key: { userId: ctx.userId, key: ctx.key }},});
   
   //if idempotency doesnt exist
   if(!existing) return null;

   //if idempotencykey expired
   if(existing.expiresAt < new Date()){
     throw new AppError(422, "This Idempotency-Key was already used with a different request");
   }

   //if idempotencykey is still in progress
   if(!existing.responseBody){
    throw new AppError(409, "A request with this Idempotency-Key is still being processed");
   }

   return existing.responseBody as Record<string, unknown>;
}


export async function claimKey(db: DbClient, ctx: IdempotencyContext, body: object){
   return db.idempotencyKey.create({
    data: {
      userId: ctx.userId,
      key:    ctx.key,
      endpoint: ctx.endpoint,
      requestHash: ctx.requestHash,
      expiresAt:   new Date(Date.now() + TTL_MS),
      }
    })
}

export function completeKey(db: DbClient, ctx: IdempotencyContext, body: object) {
  return db.idempotencyKey.update({
    where: { userId_key: { userId: ctx.userId, key: ctx.key } },
    data: { responseBody: body as never },
  });
}