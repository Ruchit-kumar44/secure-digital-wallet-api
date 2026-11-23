import { randomBytes } from "node:crypto"

export const newReference = ()=>{
    `TXN${randomBytes(6).toString("hex").toUpperCase}`
}

//this is used to generate refernce id for transactions to know transation for future use