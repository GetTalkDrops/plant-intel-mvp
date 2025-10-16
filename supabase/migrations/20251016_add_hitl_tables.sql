-- Customer Profiles Table
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL UNIQUE,
  
  -- Company info
  company_name TEXT NOT NULL,
  industry TEXT,
  primary_contact TEXT,
  
  -- Pilot tracking
  pilot_start_date DATE,
  pilot_end_date DATE,
  pilot_status TEXT DEFAULT 'active',
  
  -- Configuration
  variance_threshold_pct NUMERIC DEFAULT 15,
  min_variance_amount NUMERIC DEFAULT 1000,
  confidence_threshold_pct NUMERIC DEFAULT 65,
  
  -- Focus areas
  focus_material_costs BOOLEAN DEFAULT true,
  focus_labor_efficiency BOOLEAN DEFAULT true,
  focus_quality_issues BOOLEAN DEFAULT true,
  focus_equipment BOOLEAN DEFAULT true,
  
  -- Exclusions
  excluded_suppliers TEXT[] DEFAULT '{}',
  excluded_materials TEXT[] DEFAULT '{}',
  excluded_wo_types TEXT[] DEFAULT '{}',
  
  -- Business context
  company_overview TEXT,
  seasonal_patterns TEXT,
  known_issues TEXT,
  supplier_relationships TEXT,
  success_metrics TEXT,
  business_context TEXT,
  
  -- ROI tracking
  roi_guarantee_target NUMERIC DEFAULT 50000,
  total_savings_identified NUMERIC DEFAULT 0,
  total_savings_captured NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Analysis Reviews Table
CREATE TABLE analysis_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL,
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  
  status TEXT DEFAULT 'pending',
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  
  original_results JSONB,
  edited_results JSONB,
  internal_notes TEXT,
  checklist_completed BOOLEAN DEFAULT false,
  
  savings_identified NUMERIC DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- Calibration Notes Table
CREATE TABLE calibration_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  call_date DATE NOT NULL,
  week_number INTEGER,
  notes TEXT NOT NULL,
  action_items TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ROI Opportunities Table
CREATE TABLE roi_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  
  identified_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  
  savings_identified NUMERIC NOT NULL,
  savings_captured NUMERIC DEFAULT 0,
  
  status TEXT DEFAULT 'identified',
  source_analysis_id UUID REFERENCES analysis_reviews(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_email);
CREATE INDEX idx_analysis_reviews_batch ON analysis_reviews(batch_id);
CREATE INDEX idx_analysis_reviews_status ON analysis_reviews(status);
CREATE INDEX idx_calibration_notes_customer ON calibration_notes(customer_profile_id);
CREATE INDEX idx_roi_opportunities_customer ON roi_opportunities(customer_profile_id);

-- RLS Policies (basic - will enhance with proper auth later)
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_opportunities ENABLE ROW LEVEL SECURITY;

-- Allow service role to do everything (for now)
CREATE POLICY "Service role can do all" ON customer_profiles FOR ALL USING (true);
CREATE POLICY "Service role can do all" ON analysis_reviews FOR ALL USING (true);
CREATE POLICY "Service role can do all" ON calibration_notes FOR ALL USING (true);
CREATE POLICY "Service role can do all" ON roi_opportunities FOR ALL USING (true);
