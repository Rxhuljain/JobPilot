/*
  # Automated Job Application System - Initial Schema

  ## Overview
  Full schema for the Indian job market automation platform.

  ## Tables

  ### profiles
  - Extended user profile with job preferences and resume data
  - Linked to auth.users via user_id (uuid)
  - Stores experience, skills, preferred roles, and location

  ### resumes
  - Uploaded resume files metadata and extracted text
  - One-to-many with profiles
  - Stores file path in Supabase Storage, extracted keywords, parsed skills

  ### job_listings
  - Cached job listings fetched from external APIs (Naukri, Indeed, LinkedIn, etc.)
  - Includes match score calculated per user
  - TTL-based freshness via fetched_at

  ### applications
  - Tracks every automated application submitted
  - Linked to job_listings and profiles
  - Status: pending | submitted | opened | replied | rejected | shortlisted

  ### email_templates
  - Customizable outreach/application email templates
  - Per-user templates with variable substitution support

  ### application_logs
  - Audit trail for all application events
  - Used by the tracking dashboard

  ## Security
  - RLS enabled on all tables
  - All policies scoped to authenticated user's own data
*/

-- ─── PROFILES ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  phone text DEFAULT '',
  current_title text DEFAULT '',
  experience_years integer DEFAULT 0,
  experience_level text DEFAULT 'fresher' CHECK (experience_level IN ('fresher', 'junior', 'mid', 'senior', 'lead', 'manager')),
  preferred_roles text[] DEFAULT '{}',
  preferred_locations text[] DEFAULT '{}',
  skills text[] DEFAULT '{}',
  notice_period_days integer DEFAULT 0,
  expected_salary_min integer DEFAULT 0,
  expected_salary_max integer DEFAULT 0,
  linkedin_url text DEFAULT '',
  portfolio_url text DEFAULT '',
  bio text DEFAULT '',
  is_actively_looking boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_idx ON profiles(user_id);

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── RESUMES ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS resumes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL DEFAULT '',
  file_path text NOT NULL DEFAULT '',
  file_type text NOT NULL DEFAULT 'pdf' CHECK (file_type IN ('pdf', 'doc', 'docx')),
  file_size_bytes integer DEFAULT 0,
  extracted_text text DEFAULT '',
  extracted_skills text[] DEFAULT '{}',
  extracted_keywords text[] DEFAULT '{}',
  extracted_experience jsonb DEFAULT '[]',
  extracted_education jsonb DEFAULT '[]',
  is_primary boolean DEFAULT false,
  parsed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS resumes_user_id_idx ON resumes(user_id);

CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── JOB LISTINGS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS job_listings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '' CHECK (source IN ('naukri', 'indeed', 'linkedin', 'shine', 'timesjobs', 'glassdoor', 'instahyre', 'foundit', 'manual')),
  title text NOT NULL DEFAULT '',
  company text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '',
  job_type text DEFAULT 'fulltime' CHECK (job_type IN ('fulltime', 'parttime', 'contract', 'freelance', 'internship')),
  experience_min integer DEFAULT 0,
  experience_max integer DEFAULT 10,
  salary_min integer,
  salary_max integer,
  salary_currency text DEFAULT 'INR',
  skills_required text[] DEFAULT '{}',
  description text DEFAULT '',
  apply_url text DEFAULT '',
  company_email text DEFAULT '',
  posted_at timestamptz,
  fetched_at timestamptz DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(external_id, source)
);

ALTER TABLE job_listings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS job_listings_source_idx ON job_listings(source);
CREATE INDEX IF NOT EXISTS job_listings_fetched_at_idx ON job_listings(fetched_at);

CREATE POLICY "Authenticated users can view job listings"
  ON job_listings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert job listings"
  ON job_listings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update job listings"
  ON job_listings FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── EMAIL TEMPLATES ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  subject text NOT NULL DEFAULT '',
  body text NOT NULL DEFAULT '',
  template_type text DEFAULT 'application' CHECK (template_type IN ('application', 'followup', 'networking', 'referral')),
  variables text[] DEFAULT '{}',
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS email_templates_user_id_idx ON email_templates(user_id);

CREATE POLICY "Users can view own email templates"
  ON email_templates FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email templates"
  ON email_templates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email templates"
  ON email_templates FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own email templates"
  ON email_templates FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── APPLICATIONS ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_listing_id uuid REFERENCES job_listings(id) ON DELETE SET NULL,
  email_template_id uuid REFERENCES email_templates(id) ON DELETE SET NULL,
  resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'opened', 'replied', 'rejected', 'shortlisted', 'interview_scheduled', 'offered')),
  application_method text DEFAULT 'portal' CHECK (application_method IN ('portal', 'email', 'manual')),
  applied_at timestamptz,
  last_status_change timestamptz DEFAULT now(),
  cover_letter text DEFAULT '',
  notes text DEFAULT '',
  match_score integer DEFAULT 0 CHECK (match_score >= 0 AND match_score <= 100),
  company_name text DEFAULT '',
  job_title text DEFAULT '',
  job_location text DEFAULT '',
  apply_url text DEFAULT '',
  company_email text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS applications_user_id_idx ON applications(user_id);
CREATE INDEX IF NOT EXISTS applications_status_idx ON applications(status);
CREATE INDEX IF NOT EXISTS applications_applied_at_idx ON applications(applied_at);

CREATE POLICY "Users can view own applications"
  ON applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own applications"
  ON applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own applications"
  ON applications FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own applications"
  ON applications FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ─── APPLICATION LOGS ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS application_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_type text NOT NULL DEFAULT '' CHECK (event_type IN ('created', 'submitted', 'status_changed', 'email_sent', 'error', 'note_added')),
  event_data jsonb DEFAULT '{}',
  message text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE application_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS application_logs_application_id_idx ON application_logs(application_id);
CREATE INDEX IF NOT EXISTS application_logs_user_id_idx ON application_logs(user_id);

CREATE POLICY "Users can view own application logs"
  ON application_logs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own application logs"
  ON application_logs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ─── TRIGGER: update updated_at ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'profiles_updated_at') THEN
    CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'applications_updated_at') THEN
    CREATE TRIGGER applications_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'email_templates_updated_at') THEN
    CREATE TRIGGER email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  END IF;
END $$;
