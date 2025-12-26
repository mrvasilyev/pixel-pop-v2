DO $$
BEGIN
    -- 1. Remove Orphaned Generations (Data Cleaning)
    DELETE FROM public.generations WHERE user_id IS NOT NULL AND user_id NOT IN (SELECT id FROM public.users);

    -- 2. Add Constraint
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'generations_user_id_fkey'
    ) THEN
        ALTER TABLE public.generations 
        ADD CONSTRAINT generations_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES public.users(id);
    END IF;
END $$;
