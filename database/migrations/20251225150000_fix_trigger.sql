-- Fixed syntax for trigger function using explicit alias
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_balances AS ub (user_id, balance, credits, premium_credits, total_spent, updated_at)
    VALUES (
        NEW.user_id, 
        NEW.amount, 
        COALESCE(NEW.credits_change, 0),
        COALESCE(NEW.premium_credits_change, 0),
        CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END, 
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        balance = ub.balance + NEW.amount,
        credits = ub.credits + COALESCE(NEW.credits_change, 0),
        premium_credits = ub.premium_credits + COALESCE(NEW.premium_credits_change, 0),
        total_spent = ub.total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
