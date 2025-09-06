-- Ensure the specific test user has proper profile and permissions
-- This script will create a profile for mike@scaledbyautomations.com if it doesn't exist

DO $$
DECLARE
    test_user_id UUID;
BEGIN
    -- Get the user ID for mike@scaledbyautomations.com from auth.users
    SELECT id INTO test_user_id 
    FROM auth.users 
    WHERE email = 'mike@scaledbyautomations.com';
    
    -- If user exists, ensure they have a profile
    IF test_user_id IS NOT NULL THEN
        -- Insert profile if it doesn't exist
        INSERT INTO public.profiles (id, email, created_at, updated_at)
        VALUES (
            test_user_id,
            'mike@scaledbyautomations.com',
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            updated_at = NOW();
            
        RAISE NOTICE 'Profile ensured for user: mike@scaledbyautomations.com (ID: %)', test_user_id;
    ELSE
        RAISE NOTICE 'User mike@scaledbyautomations.com not found in auth.users table';
    END IF;
END $$;

-- Verify RLS policies are working correctly
-- Test the RLS policy for leads table
DO $$
BEGIN
    -- This will help verify that RLS policies are set up correctly
    RAISE NOTICE 'RLS is enabled on leads table: %', (
        SELECT row_security 
        FROM pg_tables 
        WHERE schemaname = 'public' AND tablename = 'leads'
    );
    
    -- Show current policies on leads table
    RAISE NOTICE 'Current policies on leads table:';
    PERFORM pg_catalog.pg_get_expr(pol.qual, pol.polrelid) as policy_expression
    FROM pg_policy pol
    JOIN pg_class pc ON pol.polrelid = pc.oid
    WHERE pc.relname = 'leads';
END $$;
