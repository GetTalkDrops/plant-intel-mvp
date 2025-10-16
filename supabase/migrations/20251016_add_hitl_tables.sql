-- =====================================================
-- HITL SYSTEM TABLES
-- Package 2: Database & Schema
-- =====================================================

-- 1. CUSTOMER PROFILES
-- Links to profiles.id, stores pilot tracking & configuration
CREATE TABLE customer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Company info
  company_name TEXT NOT NULL,
  industry TEXT,
  primary_contact TEXT,
  
  -- Pilot tracking
  pilot_start_date DATE,
  pilot_end_date DATE,
  pilot_status TEXT DEFAULT 'active', -- active, completed, cancelled
  
  -- Configuration (learned during pilot)
  variance_threshold_pct NUMERIC DEFAULT 15,
  min_variance_amount NUMERIC DEFAULT 1000,
  confidence_threshold_pct NUMERIC DEFAULT 65,
  
  -- Focus areas (booleans for each analyzer)
  focus_material_costs BOOLEAN DEFAULT true,
  focus_labor_efficiency BOOLEAN DEFAULT true,
  focus_quality_issues BOOLEAN DEFAULT true,
  focus_equipment BOOLEAN DEFAULT true,
  
  -- Exclusions (arrays for suppliers, materials, WO types)
  excluded_suppliers TEXT[] DEFAULT '{}',
  excluded_materials TEXT[] DEFAULT '{}',
  excluded_wo_types TEXT[] DEFAULT '{}',
  
  -- Business context (text fields for notes)
  company_overview TEXT,
  seasonal_patterns TEXT,
  known_issues TEXT,
  supplier_relationships TEXT,
  success_metrics TEXT,
  
  -- ROI tracking
  roi_guarantee_target NUMERIC DEFAULT 50000,
  total_savings_identified NUMERIC DEFAULT 0,
  total_savings_captured NUMERIC DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ANALYSIS REVIEWS
-- Tracks ML results, edits, and review status
CREATE TABLE analysis_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id UUID REFERENCES customer_profiles(id) ON DELETE CASCADE,
  
  -- Link to data
  batch_id TEXT NOT NULL, -- uploaded_csv_batch from work_orders
  facility_id INTEGER NOT NULL,
  
  -- Review workflow
  status TEXT DEFAULT 'pending', -- pending, in_review, approved, published
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  
  -- ML results
  original_results JSONB, -- Original ML output
  edited_results JSONB,   -- Your edited version
  
  -- Internal notes (never shown to customer)
  internal_notes TEXT,
  
  -- Checklist
  checklist_completed BOOLEAN DEFAULT false,
  
  -- Impact metrics
  savings_identified NUMERIC DEFAULT 0,
  issues_found INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ
);

-- 3. CALIBRATION NOTES
-- Stores call notes from pilot onboarding
CREATE TABLE calibration_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  
  -- Call details
  call_date DATE NOT NULL,
  week_number INTEGER, -- Week 1, 2, 3, 4 of pilot
  
  -- Notes
  notes TEXT NOT NULL,
  action_items TEXT,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. ROI OPPORTUNITIES
-- Tracks individual savings opportunities
CREATE TABLE roi_opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_profile_id UUID NOT NULL REFERENCES customer_profiles(id) ON DELETE CASCADE,
  
  -- Link to analysis that found it
  analysis_review_id UUID REFERENCES analysis_reviews(id) ON DELETE SET NULL,
  
  -- Opportunity details
  identified_date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT, -- material, labor, quality, equipment
  
  -- Financial impact
  savings_identified NUMERIC NOT NULL,
  savings_captured NUMERIC DEFAULT 0,
  
  -- Status tracking
  status TEXT DEFAULT 'identified', -- identified, in-progress, captured, not-pursued
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Customer profiles
CREATE INDEX idx_customer_profiles_user ON customer_profiles(user_id);
CREATE INDEX idx_customer_profiles_status ON customer_profiles(pilot_status);

-- Analysis reviews
CREATE INDEX idx_analysis_reviews_customer ON analysis_reviews(customer_profile_id);
CREATE INDEX idx_analysis_reviews_batch ON analysis_reviews(batch_id);
CREATE INDEX idx_analysis_reviews_status ON analysis_reviews(status);
CREATE INDEX idx_analysis_reviews_facility ON analysis_reviews(facility_id);

-- Calibration notes
CREATE INDEX idx_calibration_notes_customer ON calibration_notes(customer_profile_id);
CREATE INDEX idx_calibration_notes_date ON calibration_notes(call_date);

-- ROI opportunities
CREATE INDEX idx_roi_opportunities_customer ON roi_opportunities(customer_profile_id);
CREATE INDEX idx_roi_opportunities_status ON roi_opportunities(status);
CREATE INDEX idx_roi_opportunities_analysis ON roi_opportunities(analysis_review_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE calibration_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE roi_opportunities ENABLE ROW LEVEL SECURITY;

-- Customer profiles: Users can only access their own
CREATE POLICY "Users can view own customer profiles"
  ON customer_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own customer profiles"
  ON customer_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own customer profiles"
  ON customer_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Analysis reviews: Access through customer profile
CREATE POLICY "Users can view own analysis reviews"
  ON analysis_reviews FOR SELECT
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own analysis reviews"
  ON analysis_reviews FOR ALL
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- Calibration notes: Access through customer profile
CREATE POLICY "Users can view own calibration notes"
  ON calibration_notes FOR SELECT
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own calibration notes"
  ON calibration_notes FOR ALL
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- ROI opportunities: Access through customer profile
CREATE POLICY "Users can view own roi opportunities"
  ON roi_opportunities FOR SELECT
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own roi opportunities"
  ON roi_opportunities FOR ALL
  USING (
    customer_profile_id IN (
      SELECT id FROM customer_profiles WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_profiles_updated_at
  BEFORE UPDATE ON customer_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_roi_opportunities_updated_at
  BEFORE UPDATE ON roi_opportunities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();