-- 1. Identity Domain
-- Handle existing table structure: public.users(user_id, username, credits, created_at)
DO $$ 
BEGIN 
    -- 1. Rename user_id to id if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='user_id') THEN
        ALTER TABLE public.users RENAME COLUMN user_id TO id;
    END IF;

    -- 2. Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='first_name') THEN
        ALTER TABLE public.users ADD COLUMN first_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='last_name') THEN
        ALTER TABLE public.users ADD COLUMN last_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='language_code') THEN
        ALTER TABLE public.users ADD COLUMN language_code TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='is_premium') THEN
        ALTER TABLE public.users ADD COLUMN is_premium BOOLEAN DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='updated_at') THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
    
    -- 3. Ensure PK
    -- This might fail if duplicates exist or constraint exists with different name.
    -- Attempt to add PK if not exists.
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name='users' AND constraint_type='PRIMARY KEY') THEN
        ALTER TABLE public.users ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Fallback creation if table didn't exist at all (Should theoretically catch above if created empty, but standard CREATE IF NOT EXISTS is safer for fresh installs)
CREATE TABLE IF NOT EXISTS public.users (
    id BIGINT PRIMARY KEY, -- Telegram ID
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    is_premium BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Billing Domain (Ledger)
CREATE TABLE IF NOT EXISTS public.user_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES public.users(id),
    amount FLOAT, -- Cost in USD (negative for usage, positive for purchase)
    credits_change INT, -- Change in credits
    currency TEXT DEFAULT 'USD',
    transaction_type TEXT NOT NULL, -- 'GIFT', 'PURCHASE', 'GENERATION_USAGE', 'REFUND'
    description TEXT,
    reference_id TEXT, -- Link to generation_id or payment_id (Idempotency Key)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Constraints & Indexes
    CONSTRAINT unique_reference_id UNIQUE (reference_id) -- Prevent duplicate charges for same job/payment
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.user_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON public.users(username);

-- 3. User Balances (State Cache)
CREATE TABLE IF NOT EXISTS public.user_balances (
    user_id BIGINT PRIMARY KEY REFERENCES public.users(id),
    balance FLOAT DEFAULT 0.0, -- Current Monetary Balance
    credits INT DEFAULT 0, -- Current Credit Balance
    total_spent FLOAT DEFAULT 0.0, -- Lifetime spend
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Generation Domain (Enhanced)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generations' AND column_name='input_tokens') THEN
        ALTER TABLE public.generations ADD COLUMN input_tokens INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generations' AND column_name='output_tokens') THEN
        ALTER TABLE public.generations ADD COLUMN output_tokens INT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generations' AND column_name='model_tier') THEN
        ALTER TABLE public.generations ADD COLUMN model_tier TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generations' AND column_name='transaction_id') THEN
        ALTER TABLE public.generations ADD COLUMN transaction_id UUID REFERENCES public.user_transactions(id);
    END IF;
END $$;

-- 5. Automation (Triggers & Functions)
-- Function to update balance automatically
CREATE OR REPLACE FUNCTION public.handle_new_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update existing balance OR insert new if missing
    INSERT INTO public.user_balances (user_id, balance, credits, total_spent, updated_at)
    VALUES (
        NEW.user_id, 
        NEW.amount, 
        NEW.credits_change, 
        CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END, 
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        balance = user_balances.balance + NEW.amount,
        credits = user_balances.credits + NEW.credits_change,
        total_spent = user_balances.total_spent + CASE WHEN NEW.amount < 0 THEN ABS(NEW.amount) ELSE 0 END,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger execution
DROP TRIGGER IF EXISTS on_transaction_created ON public.user_transactions;
CREATE TRIGGER on_transaction_created
AFTER INSERT ON public.user_transactions
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_transaction();

-- 6. Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_balances ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts if re-running
DROP POLICY IF EXISTS "Service Role Full Access" ON public.users;
DROP POLICY IF EXISTS "Service Role Full Access" ON public.user_transactions;
DROP POLICY IF EXISTS "Service Role Full Access" ON public.user_balances;

-- Define Policies (Service Role Only)
CREATE POLICY "Service Role Full Access" ON public.users 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access" ON public.user_transactions 
    FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service Role Full Access" ON public.user_balances 
    FOR ALL TO service_role USING (true) WITH CHECK (true);
