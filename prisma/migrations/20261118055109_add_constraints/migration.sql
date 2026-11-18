-- This is an empty migration.

ALTER TABLE "Wallet" ADD CONSTRAINT wallet_balance_non_negative
  CHECK ("type" = 'SYSTEM' OR "balance" >= 0);
ALTER TABLE "LedgerEntry" ADD CONSTRAINT ledger_amount_positive
  CHECK ("amount" > 0);
ALTER TABLE "Transaction" ADD CONSTRAINT transaction_amount_positive
  CHECK ("amount" > 0);