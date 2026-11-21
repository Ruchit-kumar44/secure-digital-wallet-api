import { Router } from "express";
import { Validate } from "../middelware/validate.middelware.js";
import { loginSchema, refreshSchema, registerSchema } from "../schemas/auth.schema.js";
import { login, logOut, refresh, register } from "../controllers/auth.controller.js";

const authRouter = Router();

authRouter.post("/register", Validate(registerSchema), register);
authRouter.post("/login", Validate(loginSchema), login);
authRouter.post("/refresh", Validate(refreshSchema), refresh);
authRouter.post("/logout", Validate(refreshSchema), logOut);

export default authRouter;