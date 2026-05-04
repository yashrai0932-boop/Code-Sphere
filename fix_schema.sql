-- Add missing columns to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dev_role TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS resume_url TEXT;

-- Drop any duplicate foreign keys from teams to profiles if they exist
-- (This fixes the 'more than one relationship found' error)
DO $$
DECLARE
    fk_name TEXT;
BEGIN
    FOR fk_name IN (
        SELECT tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_name = 'teams'
          AND ccu.table_name = 'profiles'
          AND tc.constraint_name != 'teams_creator_id_fkey'
    ) LOOP
        EXECUTE 'ALTER TABLE public.teams DROP CONSTRAINT ' || quote_ident(fk_name);
    END LOOP;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
