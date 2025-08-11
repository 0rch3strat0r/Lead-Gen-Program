-- Utlyze Lead Gen Database Schema for Supabase
-- Run this in the Supabase SQL Editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;

-- Companies table
CREATE TABLE companies (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  domain TEXT,
  industry TEXT,
  size TEXT,
  revenue TEXT,
  location TEXT,
  tech_stack JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opportunities table
CREATE TABLE opportunities (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL,
  job_url TEXT,
  job_description TEXT,
  source TEXT, -- 'indeed', 'linkedin', 'ziprecruiter'
  score INTEGER DEFAULT 0,
  stage TEXT DEFAULT 'discovered' CHECK (stage IN ('discovered', 'enriched', 'analyzed', 'contacted', 'responded', 'meeting', 'closed', 'archived')),
  value_min INTEGER,
  value_max INTEGER,
  date_found TIMESTAMPTZ DEFAULT NOW(),
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Four Horsemen Analysis table
CREATE TABLE four_horsemen_analysis (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  brody_analysis JSONB, -- Profit/Execution analysis
  karen_analysis JSONB, -- Pain points/Attack vectors
  kevin_analysis JSONB, -- Logic/Contradictions
  pinko_analysis JSONB, -- Psychology/Intel
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contacts table
CREATE TABLE contacts (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  personality_type TEXT, -- From Crystal Knows or analysis
  communication_style JSONB,
  is_decision_maker BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scripts table (generated NEPQ scripts)
CREATE TABLE scripts (
  id BIGSERIAL PRIMARY KEY,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
  script_type TEXT CHECK (script_type IN ('email', 'linkedin', 'phone', 'voicemail', 'followup1', 'followup2', 'final')),
  subject_line TEXT,
  body_text TEXT,
  nepq_structure JSONB, -- {problem, solution, question}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Outreach tracking table
CREATE TABLE outreach (
  id BIGSERIAL PRIMARY KEY,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
  script_id BIGINT REFERENCES scripts(id),
  outreach_type TEXT CHECK (outreach_type IN ('email', 'linkedin', 'call', 'voicemail')),
  sent_at TIMESTAMPTZ,
  sent_by TEXT, -- Team member who sent it
  opened_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  response_sentiment TEXT CHECK (response_sentiment IN ('positive', 'neutral', 'negative')),
  response_text TEXT,
  notes TEXT
);

-- Reminders table (for manual follow-ups)
CREATE TABLE reminders (
  id BIGSERIAL PRIMARY KEY,
  opportunity_id BIGINT REFERENCES opportunities(id) ON DELETE CASCADE,
  contact_id BIGINT REFERENCES contacts(id) ON DELETE CASCADE,
  script_id BIGINT REFERENCES scripts(id),
  action TEXT NOT NULL, -- 'Send initial email', 'Follow up #1', etc.
  due_date DATE NOT NULL,
  priority TEXT CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
  assigned_to TEXT, -- Team member email
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Company guides table
CREATE TABLE company_guides (
  id BIGSERIAL PRIMARY KEY,
  company_id BIGINT REFERENCES companies(id) ON DELETE CASCADE,
  guide_html TEXT,
  guide_version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Team members table
CREATE TABLE team_members (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('admin', 'sales', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_opportunities_stage ON opportunities(stage);
CREATE INDEX idx_opportunities_score ON opportunities(score DESC);
CREATE INDEX idx_reminders_due_date ON reminders(due_date);
CREATE INDEX idx_reminders_assigned_to ON reminders(assigned_to);
CREATE INDEX idx_outreach_sent_at ON outreach(sent_at);
CREATE INDEX idx_companies_name ON companies(name);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at BEFORE UPDATE ON opportunities
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE four_horsemen_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create policies (everyone can read, authenticated can write)
CREATE POLICY "Public read access" ON companies FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON companies FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON opportunities FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON opportunities FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON four_horsemen_analysis FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON four_horsemen_analysis FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON contacts FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON contacts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON scripts FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON scripts FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON outreach FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON outreach FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON reminders FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON reminders FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON company_guides FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON company_guides FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public read access" ON team_members FOR SELECT USING (true);
CREATE POLICY "Authenticated write access" ON team_members FOR ALL USING (auth.role() = 'authenticated');

-- Create a view for the dashboard
CREATE VIEW dashboard_opportunities AS
SELECT 
  o.id,
  o.job_title,
  o.stage,
  o.score,
  o.value_min,
  o.value_max,
  o.date_found,
  c.name as company_name,
  c.industry,
  c.location,
  (SELECT COUNT(*) FROM reminders r WHERE r.opportunity_id = o.id AND r.completed = false) as pending_reminders,
  (SELECT MAX(sent_at) FROM outreach out WHERE out.opportunity_id = o.id) as last_contact,
  (SELECT COUNT(*) FROM outreach out WHERE out.opportunity_id = o.id AND out.replied_at IS NOT NULL) as responses
FROM opportunities o
LEFT JOIN companies c ON o.company_id = c.id
ORDER BY o.score DESC, o.date_found DESC;

-- Sample data for testing
INSERT INTO companies (name, domain, industry, size, revenue, location) VALUES
('Example Corp', 'example.com', 'Technology', '100-500', '$10M-$50M', 'Salt Lake City, UT');

INSERT INTO opportunities (company_id, job_title, job_url, source, score, value_min, value_max) VALUES
(1, 'Solutions Consultant', 'https://example.com/jobs/123', 'indeed', 85, 150000, 300000);