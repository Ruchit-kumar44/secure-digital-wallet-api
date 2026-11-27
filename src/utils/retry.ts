
function isRetryable(e: unknown): boolean {
 const err = e as {code?: string; message?: string; meta?: { code?: string }};
 
 return(
    err?.code === "P2034" ||
    err?.meta?.code === "40P01" ||
    err?.meta?.code === "40001" ||
    String(err?.message ?? "").toLowerCase().includes("deadlock")
 );
}

export async function withRetry<t>(fn: ()=> Promise<t>, attempts = 3): Promise<t>{
 for (let i = 0;  ;  i++){
    try{
      return await fn();
    } catch(e){
      if (i >= attempts || !isRetryable(e)) throw e;
      await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * i));
    }
 }
}