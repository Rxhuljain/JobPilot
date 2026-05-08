import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface JobListing {
  external_id: string;
  source: string;
  title: string;
  company: string;
  location: string;
  job_type: string;
  experience_min: number;
  experience_max: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  skills_required: string[];
  description: string;
  apply_url: string;
  company_email?: string;
  posted_at: string;
}

// Calculate match score between user profile and job listing
function calculateMatchScore(
  userSkills: string[],
  preferredRoles: string[],
  preferredLocations: string[],
  experienceYears: number,
  job: JobListing
): number {
  let score = 0;

  // Skill match (50% weight)
  const userSkillsLower = userSkills.map((s) => s.toLowerCase());
  const jobSkillsLower = job.skills_required.map((s) => s.toLowerCase());
  const matchedSkills = jobSkillsLower.filter((s) => userSkillsLower.some((u) => u.includes(s) || s.includes(u)));
  const skillScore = jobSkillsLower.length > 0 ? (matchedSkills.length / jobSkillsLower.length) * 50 : 25;
  score += skillScore;

  // Role match (25% weight)
  const titleLower = job.title.toLowerCase();
  const roleMatch = preferredRoles.some((r) => titleLower.includes(r.toLowerCase()) || r.toLowerCase().includes(titleLower.split(" ")[0]));
  if (roleMatch) score += 25;

  // Location match (15% weight)
  const locLower = job.location.toLowerCase();
  const locationMatch = preferredLocations.some((l) => locLower.includes(l.toLowerCase()) || l.toLowerCase() === "remote");
  if (locationMatch) score += 15;
  else if (locLower.includes("remote")) score += 10;

  // Experience match (10% weight)
  if (experienceYears >= job.experience_min && experienceYears <= job.experience_max + 2) score += 10;
  else if (experienceYears >= job.experience_min) score += 5;

  return Math.round(Math.min(score, 100));
}

// Generate realistic mock jobs for Indian market
// In production: replace with real API calls to RapidAPI/Naukri API/Indeed API etc.
function generateMockJobs(
  roles: string[],
  locations: string[],
  skills: string[]
): JobListing[] {
  const companies = [
    "Infosys", "TCS", "Wipro", "HCL Technologies", "Tech Mahindra",
    "Cognizant", "Accenture India", "IBM India", "Capgemini India",
    "Mindtree", "Mphasis", "Persistent Systems", "Hexaware", "NIIT Technologies",
    "Freshworks", "Zoho", "Razorpay", "PhonePe", "Paytm", "Flipkart",
    "Amazon India", "Google India", "Microsoft India", "Oracle India",
    "SAP Labs India", "Adobe India", "Atlassian India", "Swiggy", "Zomato",
  ];

  const jobTitles: Record<string, string[]> = {
    default: ["Software Engineer", "Senior Software Engineer", "Lead Engineer", "Principal Engineer", "Staff Engineer"],
    frontend: ["Frontend Developer", "React Developer", "UI Engineer", "Frontend Engineer"],
    backend: ["Backend Developer", "Node.js Developer", "Java Developer", "Python Developer"],
    fullstack: ["Full Stack Developer", "MERN Stack Developer", "MEAN Stack Developer"],
    data: ["Data Engineer", "Data Scientist", "ML Engineer", "Data Analyst", "Business Analyst"],
    devops: ["DevOps Engineer", "SRE", "Cloud Engineer", "Platform Engineer"],
    mobile: ["Android Developer", "iOS Developer", "React Native Developer", "Flutter Developer"],
    manager: ["Engineering Manager", "Tech Lead", "Delivery Manager", "Product Manager"],
  };

  const indianLocations = locations.length > 0
    ? locations
    : ["Bangalore", "Mumbai", "Hyderabad", "Pune", "Chennai", "Delhi NCR", "Noida", "Gurgaon", "Kolkata", "Ahmedabad", "Remote"];

  const sources = ["naukri", "indeed", "linkedin", "shine", "timesjobs", "foundit"] as const;

  const jobs: JobListing[] = [];
  const now = new Date();

  // Determine relevant title pool
  const titlePool: string[] = [];
  const skillsLower = skills.map((s) => s.toLowerCase());
  if (skillsLower.some((s) => ["react", "angular", "vue", "html", "css"].includes(s))) titlePool.push(...jobTitles.frontend);
  if (skillsLower.some((s) => ["nodejs", "java", "python", "django", "spring"].includes(s))) titlePool.push(...jobTitles.backend);
  if (skillsLower.some((s) => ["pandas", "tensorflow", "pytorch", "spark", "sql"].includes(s))) titlePool.push(...jobTitles.data);
  if (skillsLower.some((s) => ["docker", "kubernetes", "aws", "azure", "gcp"].includes(s))) titlePool.push(...jobTitles.devops);
  if (skillsLower.some((s) => ["android", "ios", "flutter", "react native"].includes(s))) titlePool.push(...jobTitles.mobile);
  if (titlePool.length === 0) titlePool.push(...jobTitles.default, ...jobTitles.fullstack);

  const usedTitles = roles.length > 0 ? [...roles, ...titlePool] : titlePool;

  for (let i = 0; i < 30; i++) {
    const title = usedTitles[i % usedTitles.length];
    const company = companies[Math.floor(Math.random() * companies.length)];
    const location = indianLocations[Math.floor(Math.random() * indianLocations.length)];
    const source = sources[i % sources.length];
    const expMin = [0, 1, 2, 3, 5, 7][i % 6];
    const expMax = expMin + [2, 3, 4, 5][i % 4];
    const salMin = (expMin + 1) * 200000;
    const salMax = (expMax + 1) * 350000;
    const daysAgo = Math.floor(Math.random() * 14);
    const postedDate = new Date(now.getTime() - daysAgo * 86400000);

    const jobSkills = skills.length > 0
      ? skills.slice(0, Math.min(skills.length, 3 + (i % 4))).concat(["communication", "teamwork"])
      : ["JavaScript", "React", "Node.js", "Git", "Agile"].slice(0, 3 + (i % 3));

    jobs.push({
      external_id: `mock-${source}-${i}-${Date.now()}`,
      source,
      title,
      company,
      location,
      job_type: i % 8 === 0 ? "contract" : "fulltime",
      experience_min: expMin,
      experience_max: expMax,
      salary_min: salMin,
      salary_max: salMax,
      salary_currency: "INR",
      skills_required: jobSkills,
      description: `${company} is looking for a ${title} to join our growing team in ${location}. You will work on cutting-edge projects and collaborate with world-class engineers.\n\nKey Responsibilities:\n- Design, develop and maintain scalable applications\n- Collaborate with cross-functional teams\n- Participate in code reviews and technical discussions\n- Mentor junior engineers\n\nRequired Skills: ${jobSkills.join(", ")}\n\nExperience: ${expMin}–${expMax} years\nLocation: ${location}\n\nNote: This is a simulated listing. In production, real API integrations with Naukri, Indeed, LinkedIn and Shine.com replace these mock records.`,
      apply_url: `https://www.${source === "foundit" ? "foundit.in" : source === "timesjobs" ? "timesjobs.com" : source + ".com"}/job/${i + 1000}`,
      company_email: `careers@${company.toLowerCase().replace(/\s+/g, "")}.com`,
      posted_at: postedDate.toISOString(),
    });
  }

  return jobs;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load user profile for matching
    const { data: profile } = await supabase
      .from("profiles")
      .select("skills, preferred_roles, preferred_locations, experience_years")
      .eq("user_id", user.id)
      .maybeSingle();

    const userSkills: string[] = profile?.skills || [];
    const preferredRoles: string[] = profile?.preferred_roles || [];
    const preferredLocations: string[] = profile?.preferred_locations || [];
    const experienceYears: number = profile?.experience_years || 0;

    // Generate / fetch jobs
    const rawJobs = generateMockJobs(preferredRoles, preferredLocations, userSkills);

    // Upsert into job_listings table
    const { error: upsertError } = await supabase
      .from("job_listings")
      .upsert(
        rawJobs.map((j) => ({ ...j, fetched_at: new Date().toISOString(), is_active: true })),
        { onConflict: "external_id,source", ignoreDuplicates: false }
      );

    if (upsertError) console.error("upsert error:", upsertError);

    // Fetch from DB with match scores
    const { data: jobs } = await supabase
      .from("job_listings")
      .select("*")
      .eq("is_active", true)
      .order("fetched_at", { ascending: false })
      .limit(50);

    // Calculate match scores client-side
    const jobsWithScore = (jobs || []).map((job) => ({
      ...job,
      match_score: calculateMatchScore(userSkills, preferredRoles, preferredLocations, experienceYears, job),
    }));

    // Sort by match score
    jobsWithScore.sort((a, b) => b.match_score - a.match_score);

    return new Response(
      JSON.stringify({ success: true, jobs: jobsWithScore, total: jobsWithScore.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("fetch-jobs error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
