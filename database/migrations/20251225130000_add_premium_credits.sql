-- Add Premium Credits to User Balances
ALTER TABLE public.user_balances 
ADD COLUMN IF NOT EXISTS premium_credits INT DEFAULT 0;

-- Add Premium Credits Change to Transactions
ALTER TABLE public.user_transactions 
ADD COLUMN IF NOT EXISTS premium_credits_change INT DEFAULT 0;

-- Update the Trigger Function to handle premium_credits
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_balances (user_id, balance, credits, premium_credits, total_spent, updated_at)
    VALUES (
        NEW.user_id, 
        NEW.amount, 
        COALESCE(NEW.credits_change, 0),
        COALESCE(NEW.premium_credits_change, 0),
        CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END, 
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        balance = user_balances.balance + NEW.amount,
        credits = user_balances.credits + COALESCE(NEW.credits_change, 0),
        premium_credits = user_balances.premium_credits + COALESCE(NEW.premium_credits_change, 0),
        total_spent = user_balances.total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
