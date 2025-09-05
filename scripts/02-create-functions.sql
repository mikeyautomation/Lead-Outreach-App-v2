-- Database Functions and Triggers for Lead Outreach App

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON public.leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_campaign_leads_updated_at BEFORE UPDATE ON public.campaign_leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update campaign statistics
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
    -- Update campaign statistics based on campaign_leads changes
    UPDATE public.campaigns 
    SET 
        total_leads = (
            SELECT COUNT(*) 
            FROM public.campaign_leads 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id)
        ),
        sent_count = (
            SELECT COUNT(*) 
            FROM public.campaign_leads 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) 
            AND status IN ('sent', 'opened', 'clicked', 'replied')
        ),
        opened_count = (
            SELECT COUNT(*) 
            FROM public.campaign_leads 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) 
            AND status IN ('opened', 'clicked', 'replied')
        ),
        replied_count = (
            SELECT COUNT(*) 
            FROM public.campaign_leads 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) 
            AND status = 'replied'
        ),
        clicked_count = (
            SELECT COUNT(*) 
            FROM public.campaign_leads 
            WHERE campaign_id = COALESCE(NEW.campaign_id, OLD.campaign_id) 
            AND status IN ('clicked', 'replied')
        )
    WHERE id = COALESCE(NEW.campaign_id, OLD.campaign_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ language 'plpgsql';

-- Trigger to update campaign stats
CREATE TRIGGER update_campaign_statistics
    AFTER INSERT OR UPDATE OR DELETE ON public.campaign_leads
    FOR EACH ROW EXECUTE FUNCTION update_campaign_stats();
