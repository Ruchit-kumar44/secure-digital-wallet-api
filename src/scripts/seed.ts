import { prisma } from "../config/prisma.js";

async function main(){
    const existing = await prisma.wallet.findFirst({where: {type: "SYSTEM"}});
    if(!existing){
        await prisma.wallet.create({data: {type: "SYSTEM"}});
        console.log("System wallet created");
    } else{
        console.log("system wallet already exist");
    }
    await prisma.$disconnect();
}

main().catch((e)=>{
    console.log(e);
    process.exit(1);
})