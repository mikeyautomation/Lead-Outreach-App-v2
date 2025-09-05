-- Add UNIQUE constraint on email field for leads table
-- This is required for upsert operations to work properly

ALTER TABLE leads ADD CONSTRAINT leads_email_unique UNIQUE (email);

-- Optional: Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
