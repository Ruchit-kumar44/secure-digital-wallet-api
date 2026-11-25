
//rupees to paise
export function rupeesToPaise(rupees: number | string): bigint {
  const str = String(rupees).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(str)) {
    throw new Error("Invalid rupee amount (max 2 decimal places allowed)");
  }
  const [whole = "0", fraction = ""] = str.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}


//paise to rupees 
export function paiseToRupees(paise: bigint): string {
  const isNegative = paise < 0n;
  const abs = isNegative ? -paise : paise;
  const rupees = abs / 100n;
  const remainder = (abs % 100n).toString().padStart(2, "0");
  return `${isNegative ? "-" : ""}${rupees}.${remainder}`;
}