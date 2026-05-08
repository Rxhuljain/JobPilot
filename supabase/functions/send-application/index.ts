import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

function interpolateTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
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

    const body = await req.json();
    const { applicationId, method } = body as { applicationId: string; method: "portal" | "email" };

    if (!applicationId) {
      return new Response(JSON.stringify({ error: "applicationId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load application with related data
    const { data: application, error: appError } = await supabase
      .from("applications")
      .select(`
        *,
        job_listings(*),
        email_templates(subject, body),
        resumes(file_name, extracted_skills)
      `)
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (appError || !application) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone, current_title, experience_years, linkedin_url")
      .eq("user_id", user.id)
      .maybeSingle();

    const templateVars: Record<string, string> = {
      applicant_name: profile?.full_name || user.email || "Applicant",
      applicant_email: profile?.email || user.email || "",
      applicant_phone: profile?.phone || "",
      applicant_title: profile?.current_title || "",
      experience_years: String(profile?.experience_years || 0),
      linkedin_url: profile?.linkedin_url || "",
      job_title: application.job_title || application.job_listings?.title || "",
      company_name: application.company_name || application.job_listings?.company || "",
      job_location: application.job_location || application.job_listings?.location || "",
      apply_url: application.apply_url || application.job_listings?.apply_url || "",
      resume_name: application.resumes?.file_name || "",
      skills: (application.resumes?.extracted_skills || profile?.skills || []).slice(0, 8).join(", "),
    };

    let emailSubject = "";
    let emailBody = "";

    if (application.email_templates) {
      emailSubject = interpolateTemplate(application.email_templates.subject, templateVars);
      emailBody = interpolateTemplate(application.email_templates.body, templateVars);
    } else {
      // Default template
      emailSubject = `Application for ${templateVars.job_title} position - ${templateVars.applicant_name}`;
      emailBody = `Dear Hiring Manager,

I am writing to express my interest in the ${templateVars.job_title} position at ${templateVars.company_name}.

With ${templateVars.experience_years} years of experience as a ${templateVars.applicant_title}, I bring strong expertise in ${templateVars.skills}.

I am confident that my background aligns well with your requirements and I would be excited to contribute to ${templateVars.company_name}'s growth.

Please find my resume attached. I would welcome the opportunity to discuss how my experience can benefit your team.

Best regards,
${templateVars.applicant_name}
${templateVars.applicant_email}
${templateVars.applicant_phone}
${templateVars.linkedin_url ? `LinkedIn: ${templateVars.linkedin_url}` : ""}`;
    }

    // In production: integrate with Gmail API / SendGrid / SMTP here
    // For now we simulate the send and record the outcome
    const sendResult = {
      success: true,
      method: method || application.application_method,
      to: application.company_email || application.job_listings?.company_email || "",
      subject: emailSubject,
      body: emailBody,
      // Integration point: replace with actual email send
      // e.g. await sendViaGmailAPI(accessToken, to, subject, body, attachmentPath)
      simulated: true,
      note: "Email send is simulated. Configure Gmail API or SMTP credentials in edge function secrets to enable real sending.",
    };

    // Update application status to submitted
    const { error: updateError } = await supabase
      .from("applications")
      .update({
        status: "submitted",
        applied_at: new Date().toISOString(),
        cover_letter: emailBody,
        last_status_change: new Date().toISOString(),
      })
      .eq("id", applicationId)
      .eq("user_id", user.id);

    if (updateError) throw updateError;

    // Log the event
    await supabase.from("application_logs").insert({
      application_id: applicationId,
      user_id: user.id,
      event_type: "submitted",
      event_data: { method: sendResult.method, to: sendResult.to, subject: emailSubject },
      message: `Application submitted via ${sendResult.method}`,
    });

    return new Response(
      JSON.stringify({ success: true, result: sendResult }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("send-application error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
