import { prisma } from "../config/prisma.js";
import { walletService } from "../services/wallet.service.js";
import { p2ptransferService } from "../services/p2ptransfer.service.js";
import { paiseToRupees, rupeesToPaise } from "../utils/amountConversion.js";

let counter = 0;

async function createUser(name: string, startRupees: number) {
  const phone = `9${String(Date.now()).slice(-8)}${counter++}`;
  const user = await prisma.user.create({
    data: { name, phone, upiId: `${phone}@paywallet`, passwordHash: "not-used", wallet: { create: {} } },
    include: { wallet: true },
  });
  if (startRupees > 0) await walletService.topUp(user.id, { amount: startRupees });
  return { id: user.id, walletId: user.wallet!.id };
}

//findUniqueAndThrow Fetch the updated row inside `current transaction tx` so we have `senderAfter.balance` for LedgerEntry
async function balanceOf(walletId: string) {
  return (await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } })).balance;
}

function summarize(results: PromiseSettledResult<unknown>[]) {
  const reasons: Record<string, number> = {};
  let ok = 0;
  for (const r of results) {
    if (r.status === "fulfilled") ok++;
    else {
      const msg = String((r.reason as Error).message ?? r.reason).trim().split("\n").pop()!.slice(0, 110);
      reasons[msg] = (reasons[msg] ?? 0) + 1;
    }
  }
  return { ok, failed: results.length - ok, reasons };
}

function check(label: string, condition: boolean) {
  console.log(`${condition ? "PASS" : "FAIL"}  ${label}`);
}

// Test 1: opposite-direction transfers (deadlock test)
async function testOpposite() {
  console.log("\nTest 1: 50 transfers A->B of (₹1) and 50 transfers(₹2) at the same time");
  const a = await createUser("A", 1_000_0); // ₹10,000 = 1,000,000 paise
  const b = await createUser("B", 1_000_0); // ₹10,000 = 1,000,000 paise

  const jobs: Promise<unknown>[] = [];
  for (let i = 0; i < 50; i++) {
    jobs.push(p2ptransferService.moveMoney({ senderWalletId: a.walletId, receiverWalletId: b.walletId, amount: rupeesToPaise(1) }));
    jobs.push(p2ptransferService.moveMoney({ senderWalletId: b.walletId, receiverWalletId: a.walletId, amount: rupeesToPaise(2) }));
  }
  const summary = summarize(await Promise.allSettled(jobs));
  console.log(summary);

  const balA = await balanceOf(a.walletId);
  const balB = await balanceOf(b.walletId);

  check("all 100 transfers succeeded", summary.ok === 100);
  check(`A ended with ₹10,050.00 (got ₹${paiseToRupees(balA)})`, balA === rupeesToPaise(10_050));
  check(`B ended with ₹9,950.00 (got ₹${paiseToRupees(balB)})`, balB === rupeesToPaise(9_950));
}

// Test 2: overspend (check-then-act race)
async function testOverspend() {
  console.log("\nTest 2: 100 parallel transfers of ₹50 from a ₹1,000 wallet (only 20 can succeed)");
  const a = await createUser("A", 1000);
  const b = await createUser("B", 0);

  const jobs = Array.from({ length: 100 }, () =>
    p2ptransferService.moveMoney({ senderWalletId: a.walletId, receiverWalletId: b.walletId, amount: rupeesToPaise(50) }),
  );
  const summary = summarize(await Promise.allSettled(jobs));
  console.log(summary);

  const balA = await balanceOf(a.walletId);
  const balB = await balanceOf(b.walletId);

  check("exactly 20 succeeded", summary.ok === 20);
  check(`sender balance is ₹0.00 (got ₹${paiseToRupees(balA)})`, balA === 0n);
  check(`receiver has ₹1,000.00 (got ₹${paiseToRupees(balB)})`, balB === rupeesToPaise(1_000));
}

// Test 3: parallel top-ups (lost update test)
async function testTopUps() {
  console.log("\nTest 3: 100 parallel top-ups of ₹1");
  const a = await createUser("A", 0);
  const jobs = Array.from({ length: 100 }, () => walletService.topUp(a.id, { amount: 1 }));
  const summary = summarize(await Promise.allSettled(jobs));
  console.log(summary);

  check("all 100 top-ups succeeded", summary.ok === 100);
  check("balance is exactly 10,000 paise", (await balanceOf(a.walletId)) === 10_000n);
}

async function main() {
  await testOpposite();
  await testOverspend();
  await testTopUps();
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});