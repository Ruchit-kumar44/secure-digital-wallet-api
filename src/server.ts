import  express  from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middelware/errorHandler.middelware.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.route.js";

const app = express();


app.use(express.json());

app.use("/auth", authRouter)
app.use("/user", userRouter)

//errorhandler middelwares
app.use(notFound);
app.use(errorHandler)

app.listen(env.port, ()=>{
    console.log("server is running")
})