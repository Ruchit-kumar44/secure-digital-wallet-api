import { Router } from "express";
import { requireAuth } from "../middelware/auth.middelware.js";
import { Validate } from "../middelware/validate.middelware.js";
import { transferSchema } from "../schemas/transfer.schema.js";
import { createTransfer } from "../controllers/p2ptransfer.controller.js";

export const p2ptransferRouter =  Router();
 
p2ptransferRouter.post("/", requireAuth, Validate(transferSchema), createTransfer);