import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

// Extracts text from PDF bytes using a basic heuristic (real parsing requires pdf-parse in Node.js)
function extractTextFromPdfBytes(bytes: Uint8Array): string {
  const decoder = new TextDecoder("latin1");
  const raw = decoder.decode(bytes);
  // Extract readable text between BT/ET markers and stream blocks
  const textParts: string[] = [];
  const tdRegex = /\(([^)]{2,200})\)\s*Tj/g;
  const arrayRegex = /\[([^\]]+)\]\s*TJ/g;
  let m: RegExpExecArray | null;
  while ((m = tdRegex.exec(raw)) !== null) {
    const text = m[1].replace(/\\[0-9]{3}/g, " ").replace(/\\\(/g, "(").replace(/\\\)/g, ")");
    if (text.trim().length > 1) textParts.push(text.trim());
  }
  while ((m = arrayRegex.exec(raw)) !== null) {
    const parts = m[1].match(/\(([^)]*)\)/g);
    if (parts) {
      const joined = parts.map((p) => p.slice(1, -1)).join("").replace(/\\[0-9]{3}/g, " ");
      if (joined.trim().length > 1) textParts.push(joined.trim());
    }
  }
  // Fallback: grab printable ASCII runs
  if (textParts.length < 10) {
    const ascii = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, "\n");
    textParts.push(ascii.slice(0, 10000));
  }
  return textParts.join(" ").replace(/\s+/g, " ").trim();
}

// Skill taxonomy for Indian job market
const SKILL_KEYWORDS = [
  // Languages
  "java", "python", "javascript", "typescript", "c++", "c#", "golang", "rust", "kotlin", "swift",
  "php", "ruby", "scala", "r", "matlab", "dart", "perl",
  // Frontend
  "react", "angular", "vue", "nextjs", "svelte", "html", "css", "sass", "tailwind", "bootstrap",
  "redux", "webpack", "vite", "figma",
  // Backend
  "nodejs", "express", "spring", "django", "flask", "fastapi", "laravel", "rails", "nestjs",
  "graphql", "rest", "grpc", "microservices",
  // Databases
  "mysql", "postgresql", "mongodb", "redis", "elasticsearch", "cassandra", "dynamodb", "sqlite",
  "oracle", "mssql", "supabase", "firebase",
  // Cloud / DevOps
  "aws", "azure", "gcp", "docker", "kubernetes", "terraform", "jenkins", "gitlab", "github",
  "ci/cd", "linux", "nginx", "apache",
  // Data / AI
  "machine learning", "deep learning", "tensorflow", "pytorch", "scikit-learn", "pandas",
  "numpy", "spark", "hadoop", "tableau", "power bi", "sql",
  // Mobile
  "android", "ios", "react native", "flutter", "xamarin",
  // Soft skills / Methodologies
  "agile", "scrum", "kanban", "jira", "git", "project management", "team leadership",
];

function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_KEYWORDS.filter((skill) => lower.includes(skill));
}

function extractKeywords(text: string): string[] {
  const words = text
    .replace(/[^a-zA-Z0-9+#. ]/g, " ")
    .split(/\s+/)
    .map((w) => w.toLowerCase().trim())
    .filter((w) => w.length > 3 && w.length < 30);
  const freq: Record<string, number> = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  return Object.entries(freq)
    .filter(([, c]) => c > 1)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([w]) => w);
}

function extractExperience(text: string): unknown[] {
  const exp: unknown[] = [];
  // Match patterns like "Software Engineer at TCS (2019-2022)"
  const patterns = [
    /([A-Z][a-zA-Z ]{2,40})\s+at\s+([A-Z][a-zA-Z ]{1,40})[,\s]+\(?(20\d{2})\s*[-–]\s*(20\d{2}|present|current)\)?/gi,
    /([A-Z][a-zA-Z ]{2,40}),\s+([A-Z][a-zA-Z ]{1,40})\s+\(?(20\d{2})\s*[-–]\s*(20\d{2}|present|current)\)?/gi,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      exp.push({ title: m[1].trim(), company: m[2].trim(), from: m[3], to: m[4] });
    }
  }
  return exp.slice(0, 10);
}

function extractEducation(text: string): unknown[] {
  const edu: unknown[] = [];
  const patterns = [
    /(B\.?Tech|M\.?Tech|B\.?E|M\.?E|BCA|MCA|B\.?Sc|M\.?Sc|MBA|PhD|B\.?Com|M\.?Com)[,\s]+([A-Z][a-zA-Z ]{3,50})[,\s]+(19|20)\d{2}/gi,
  ];
  for (const pattern of patterns) {
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(text)) !== null) {
      edu.push({ degree: m[1], institution: m[2].trim(), year: m[0].match(/(19|20)\d{2}/)?.[0] });
    }
  }
  return edu.slice(0, 5);
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

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const resumeId = formData.get("resumeId") as string | null;

    if (!file || !resumeId) {
      return new Response(JSON.stringify({ error: "file and resumeId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    let extractedText = "";

    const fileName = file.name.toLowerCase();
    if (fileName.endsWith(".pdf")) {
      extractedText = extractTextFromPdfBytes(bytes);
    } else {
      // For DOCX files treat as text (basic extraction)
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const raw = decoder.decode(bytes);
      extractedText = raw.replace(/[^\x20-\x7E\n\r\t]/g, " ").replace(/\s{3,}/g, "\n").trim();
    }

    const skills = extractSkills(extractedText);
    const keywords = extractKeywords(extractedText);
    const experience = extractExperience(extractedText);
    const education = extractEducation(extractedText);

    const { error: updateError } = await supabase
      .from("resumes")
      .update({
        extracted_text: extractedText.slice(0, 50000),
        extracted_skills: skills,
        extracted_keywords: keywords,
        extracted_experience: experience,
        extracted_education: education,
        parsed_at: new Date().toISOString(),
      })
      .eq("id", resumeId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Also update profile skills with union of extracted skills
    const { data: profile } = await supabase
      .from("profiles")
      .select("skills")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profile) {
      const merged = Array.from(new Set([...(profile.skills || []), ...skills]));
      await supabase.from("profiles").update({ skills: merged }).eq("user_id", user.id);
    }

    return new Response(
      JSON.stringify({ success: true, skills, keywords, experience, education, textLength: extractedText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("parse-resume error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
