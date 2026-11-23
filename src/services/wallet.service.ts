import { prisma } from "../config/prisma.js"
import { AppError } from "../utils/appError.js"

export const walletService = {
    async getWallet(userId: string){
       const wallet  = await prisma.wallet.findUnique({where: {userId: userId}})
       if(!wallet){
        throw new AppError(404, "Wallet not found")
       }
       return {id: wallet.id, balance: wallet.balance.toString(), currency: wallet.currency}
    }
}