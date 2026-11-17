import  express  from "express";
import { env } from "./config/env.js";

const app = express();


app.use(express.json());

app.get("/", (req, res)=>{
    res.json({message: "welcome to the home page"})
})



app.listen(env.port, ()=>{
    console.log("server is running")
})