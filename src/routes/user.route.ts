import { Router } from "express";
import { requireAuth } from "../middelware/auth.middelware.js";
import { getMe, setPin } from "../controllers/user.controller.js";
import { Validate } from "../middelware/validate.middelware.js";
import { setPinSchema } from "../schemas/auth.schema.js";

const userRouter = Router();

userRouter.get("/me", requireAuth, getMe)
userRouter.post("/me/pin", requireAuth, Validate(setPinSchema), setPin)

export default userRouter;