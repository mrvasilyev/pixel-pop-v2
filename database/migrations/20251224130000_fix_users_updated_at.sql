-- Fix missing column due to ambiguous query in previous migration
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='users' 
        AND table_schema='public' -- Strict schema check
        AND column_name='updated_at'
    ) THEN
        ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;
