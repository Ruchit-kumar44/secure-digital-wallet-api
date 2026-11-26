import  express  from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middelware/errorHandler.middelware.js";
import authRouter from "./routes/auth.routes.js";
import userRouter from "./routes/user.route.js";
import { walletRouter } from "./routes/wallet.routes.js";
import { p2ptransferRouter } from "./routes/p2ptransfer.js";

const app = express();


app.use(express.json());

app.get("/", async(req, res)=>{
    res.json({message: "welcome to secure-wallet-api project"})
});
app.use("/auth", authRouter);
app.use("/user", userRouter);
app.use("/wallet", walletRouter);
app.use("/transfers", p2ptransferRouter)

//errorhandler middelwares
app.use(notFound);
app.use(errorHandler);

app.listen(env.port, ()=>{
    console.log("server is running")
})