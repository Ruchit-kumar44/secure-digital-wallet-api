import  express  from "express";
import { env } from "./config/env.js";
import { errorHandler, notFound } from "./middelware/errorHandler.js";

const app = express();


app.use(express.json());

app.get("/", (req, res)=>{
    res.json({message: "welcome to the home page"})
})

app.use(notFound);
app.use(errorHandler)

app.listen(env.port, ()=>{
    console.log("server is running")
})