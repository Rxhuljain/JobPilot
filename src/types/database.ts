export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { user_id: string };
        Update: Partial<Profile>;
      };
      resumes: {
        Row: Resume;
        Insert: Partial<Resume> & { user_id: string; file_name: string; file_path: string };
        Update: Partial<Resume>;
      };
      job_listings: {
        Row: JobListing;
        Insert: Partial<JobListing>;
        Update: Partial<JobListing>;
      };
      applications: {
        Row: Application;
        Insert: Partial<Application> & { user_id: string };
        Update: Partial<Application>;
      };
      email_templates: {
        Row: EmailTemplate;
        Insert: Partial<EmailTemplate> & { user_id: string; name: string; subject: string; body: string };
        Update: Partial<EmailTemplate>;
      };
      application_logs: {
        Row: ApplicationLog;
        Insert: Partial<ApplicationLog> & { application_id: string; user_id: string; event_type: string };
        Update: never;
      };
    };
  };
}

export interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  current_title: string;
  experience_years: number;
  experience_level: 'fresher' | 'junior' | 'mid' | 'senior' | 'lead' | 'manager';
  preferred_roles: string[];
  preferred_locations: string[];
  skills: string[];
  notice_period_days: number;
  expected_salary_min: number;
  expected_salary_max: number;
  linkedin_url: string;
  portfolio_url: string;
  bio: string;
  is_actively_looking: boolean;
  created_at: string;
  updated_at: string;
}

export interface Resume {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string;
  file_type: 'pdf' | 'doc' | 'docx';
  file_size_bytes: number;
  extracted_text: string;
  extracted_skills: string[];
  extracted_keywords: string[];
  extracted_experience: Json[];
  extracted_education: Json[];
  is_primary: boolean;
  parsed_at: string | null;
  created_at: string;
}

export interface JobListing {
  id: string;
  external_id: string;
  source: 'naukri' | 'indeed' | 'linkedin' | 'shine' | 'timesjobs' | 'glassdoor' | 'instahyre' | 'foundit' | 'manual';
  title: string;
  company: string;
  location: string;
  job_type: 'fulltime' | 'parttime' | 'contract' | 'freelance' | 'internship';
  experience_min: number;
  experience_max: number;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  skills_required: string[];
  description: string;
  apply_url: string;
  company_email: string | null;
  posted_at: string | null;
  fetched_at: string;
  is_active: boolean;
  match_score?: number;
}

export interface Application {
  id: string;
  user_id: string;
  job_listing_id: string | null;
  email_template_id: string | null;
  resume_id: string | null;
  status: 'pending' | 'submitted' | 'opened' | 'replied' | 'rejected' | 'shortlisted' | 'interview_scheduled' | 'offered';
  application_method: 'portal' | 'email' | 'manual';
  applied_at: string | null;
  last_status_change: string;
  cover_letter: string;
  notes: string;
  match_score: number;
  company_name: string;
  job_title: string;
  job_location: string;
  apply_url: string;
  company_email: string;
  created_at: string;
  updated_at: string;
}

export interface EmailTemplate {
  id: string;
  user_id: string;
  name: string;
  subject: string;
  body: string;
  template_type: 'application' | 'followup' | 'networking' | 'referral';
  variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface ApplicationLog {
  id: string;
  application_id: string;
  user_id: string;
  event_type: 'created' | 'submitted' | 'status_changed' | 'email_sent' | 'error' | 'note_added';
  event_data: Json;
  message: string;
  created_at: string;
}
