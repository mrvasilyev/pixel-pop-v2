-- Remove legacy credits column as we now use user_balances and transaction ledger
ALTER TABLE public.users DROP COLUMN IF EXISTS credits;
