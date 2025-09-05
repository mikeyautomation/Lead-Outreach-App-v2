-- Lead Outreach App Database Schema
-- This script creates all necessary tables for the lead outreach application

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create leads table
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Contact Information
    first_name TEXT,
    last_name TEXT,
    contact_name TEXT,
    email TEXT UNIQUE, -- Unique constraint for upsert operations
    phone TEXT,
    title TEXT,
    position TEXT,
    
    -- Company Information
    company_name TEXT,
    company TEXT,
    company_website TEXT,
    industry TEXT,
    company_size TEXT,
    location TEXT,
    
    -- Lead Details
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'responded', 'qualified', 'converted', 'lost')),
    notes TEXT,
    linkedin_url TEXT,
    scraped_from TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaigns table
CREATE TABLE IF NOT EXISTS public.campaigns (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    
    -- Campaign Details
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    email_content TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed', 'cancelled')),
    
    -- Follow-up Configuration
    follow_up_sequence JSONB DEFAULT '[]',
    scheduled_at TIMESTAMP WITH TIME ZONE,
    
    -- Statistics
    total_leads INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    
    -- External Integration
    external_id TEXT, -- For SmartLead or other integrations
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campaign_leads junction table
CREATE TABLE IF NOT EXISTS public.campaign_leads (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    
    -- Lead Status in Campaign
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed')),
    sent_at TIMESTAMP WITH TIME ZONE,
    opened_at TIMESTAMP WITH TIME ZONE,
    replied_at TIMESTAMP WITH TIME ZONE,
    
    -- Email Details
    email_subject TEXT,
    email_content TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique lead per campaign
    UNIQUE(campaign_id, lead_id)
);

-- Create email_tracking table
CREATE TABLE IF NOT EXISTS public.email_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    campaign_lead_id UUID REFERENCES public.campaign_leads(id) ON DELETE CASCADE,
    
    -- Tracking Details
    event_type TEXT NOT NULL CHECK (event_type IN ('sent', 'delivered', 'opened', 'clicked', 'replied', 'bounced', 'unsubscribed')),
    event_data JSONB DEFAULT '{}',
    user_agent TEXT,
    ip_address INET,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create link_tracking table
CREATE TABLE IF NOT EXISTS public.link_tracking (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES public.leads(id) ON DELETE CASCADE NOT NULL,
    email_tracking_id UUID REFERENCES public.email_tracking(id) ON DELETE CASCADE,
    
    -- Link Details
    original_url TEXT NOT NULL,
    tracked_url TEXT NOT NULL,
    click_count INTEGER DEFAULT 0,
    
    -- Click Details
    user_agent TEXT,
    ip_address INET,
    clicked_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_email ON public.leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_source ON public.leads(source);

CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON public.campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);

CREATE INDEX IF NOT EXISTS idx_campaign_leads_campaign_id ON public.campaign_leads(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_lead_id ON public.campaign_leads(lead_id);
CREATE INDEX IF NOT EXISTS idx_campaign_leads_status ON public.campaign_leads(status);

CREATE INDEX IF NOT EXISTS idx_email_tracking_campaign_id ON public.email_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_lead_id ON public.email_tracking(lead_id);
CREATE INDEX IF NOT EXISTS idx_email_tracking_event_type ON public.email_tracking(event_type);

CREATE INDEX IF NOT EXISTS idx_link_tracking_campaign_id ON public.link_tracking(campaign_id);
CREATE INDEX IF NOT EXISTS idx_link_tracking_lead_id ON public.link_tracking(lead_id);
