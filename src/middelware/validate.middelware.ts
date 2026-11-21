import type { NextFunction, Request, Response } from "express";
import { ZodType } from "zod";
import { AppError } from "../utils/appError.js";

export function Validate(schema: ZodType){
   return (
    req: Request,
    _res: Response,
    next: NextFunction
   )=>{
     const result = schema.safeParse({body: req.body, params: req.params, query: req.query});
     if(!result.success){
        throw new AppError(
            400,
            "Validation failed",
            result.error.issues.map((i)=>({ field: i.path.join("."), message: i.message }))
        );
     }
     req.body = result.data;
     next()
   }
}