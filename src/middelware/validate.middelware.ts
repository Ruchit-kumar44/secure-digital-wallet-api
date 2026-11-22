import type { NextFunction, Request, Response } from "express";
import z from "zod";
import { AppError } from "../utils/appError.js";

export function Validate(schema: z.ZodType<{body?: unknown, params?: unknown, query? : unknown }>){
   return (
    req: Request,
    res: Response,
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

    const {body, params, query} = result.data;
    const parsedData = result.data;
    if (body !== undefined) {
      req.body = body;
    };
    res.locals.validated = { params, query };
    next();
  };
   
}