import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.98.0/cors";

const SMTP_HOST = "smtp.gmail.com";
const SMTP_PORT = 587;

async function sendEmail(to: string, subject: string, html: string) {
  const user = Deno.env.get("GMAIL_USER")!;
  const pass = Deno.env.get("GMAIL_APP_PASSWORD")!;

  const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

  const client = new SMTPClient({
    connection: {
      hostname: SMTP_HOST,
      port: SMTP_PORT,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  await client.send({
    from: user,
    to,
    subject,
    content: "Please view this email in an HTML-capable client.",
    html,
  });

  await client.close();
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function welcomeEmailHtml(fullName: string, grade: number | null, loginUrl: string, supportEmail: string) {
  return `
  <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 640px; margin: 0 auto; background:#f3f4f6; padding: 24px;">
    <div style="background: linear-gradient(135deg, #047857, #facc15 70%, #dc2626); padding: 28px; border-radius: 16px 16px 0 0; text-align:center;">
      <div style="display:inline-block; background:white; border-radius: 50%; padding: 14px; margin-bottom: 12px;">
        <span style="font-size: 28px;">🎓</span>
      </div>
      <h1 style="color:white; margin:0; font-size:24px;">Welcome to Haylat_EdTech</h1>
      <p style="color: rgba(255,255,255,0.95); margin:6px 0 0; font-size:14px;">Powered by HG7_Tech</p>
    </div>
    <div style="background:#ffffff; padding:32px; border:1px solid #e5e7eb; border-top:none; border-radius:0 0 16px 16px;">
      <h2 style="color:#111827; margin-top:0;">Hello ${fullName || "Student"} 👋</h2>
      <p style="color:#374151; line-height:1.65; font-size:15px;">
        Great news — your account has been <strong style="color:#047857;">approved and activated</strong>!
        Your registration is complete, your payment has been verified, and you're ready to start
        your learning journey with Haylat_EdTech${grade ? ` for <strong>Grade ${grade}</strong>` : ""}.
      </p>
      <div style="background:#f0fdf4; border-left:4px solid #047857; padding:16px; border-radius:8px; margin:20px 0;">
        <p style="margin:0; color:#065f46; font-size:14px;">
          ✅ Account active &nbsp; • &nbsp; ✅ Payment verified &nbsp; • &nbsp; ✅ Approved by Admin
        </p>
      </div>
      <p style="color:#374151; line-height:1.65; font-size:15px;">
        You now have full access to grade-level lessons, AI tutoring, exams, quizzes, and learning materials.
      </p>
      <div style="text-align:center; margin: 28px 0;">
        <a href="${loginUrl}" style="display:inline-block; padding:14px 36px; background: linear-gradient(135deg, #047857, #065f46); color:white; text-decoration:none; border-radius:10px; font-weight:600; font-size:15px;">
          🚀 Log In & Start Learning
        </a>
      </div>
      <div style="border-top:1px solid #e5e7eb; padding-top:18px; margin-top:18px;">
        <p style="color:#6b7280; font-size:13px; margin:0 0 6px;">Need help? We're here for you.</p>
        <p style="color:#374151; font-size:13px; margin:0;">📧 Support: <a href="mailto:${supportEmail}" style="color:#047857;">${supportEmail}</a></p>
      </div>
    </div>
    <p style="text-align:center; color:#9ca3af; font-size:12px; margin-top:16px;">
      © ${new Date().getFullYear()} Haylat_EdTech • HG7_Tech. All rights reserved.
    </p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { userId, type, status: accountStatus } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail = Deno.env.get("ADMIN_EMAIL")!;

    const supabase = createClient(supabaseUrl, serviceKey);

    if (type === "new_registration") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, grade, branch_id, created_at, user_id")
        .eq("user_id", userId)
        .single();

      if (!profile) {
        return new Response(JSON.stringify({ error: "Profile not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email ?? "unknown";

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      let branchName = "Not assigned";
      if (profile.branch_id) {
        const { data: branch } = await supabase
          .from("branches")
          .select("name")
          .eq("id", profile.branch_id)
          .single();
        branchName = branch?.name ?? "Unknown";
      }

      const { data: approveToken } = await supabase
        .from("registration_tokens")
        .insert({ user_id: userId, action: "approve" })
        .select("token")
        .single();

      const { data: rejectToken } = await supabase
        .from("registration_tokens")
        .insert({ user_id: userId, action: "reject" })
        .select("token")
        .single();

      const baseUrl = `${supabaseUrl}/functions/v1/handle-registration-approval`;
      const approveUrl = `${baseUrl}?token=${approveToken?.token}&action=approve`;
      const rejectUrl = `${baseUrl}?token=${rejectToken?.token}&action=reject`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 22px;">🎓 New User Registration</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 5px 0 0;">Haylat_EdTech – Approval Required</p>
          </div>
          <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #6b7280; width: 120px;">Full Name</td><td style="padding: 8px 0; font-weight: 600;">${profile.full_name || "N/A"}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Email</td><td style="padding: 8px 0; font-weight: 600;">${userEmail}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Role</td><td style="padding: 8px 0; font-weight: 600;">${roleData?.role ?? "student"}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Branch</td><td style="padding: 8px 0; font-weight: 600;">${branchName}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Grade</td><td style="padding: 8px 0; font-weight: 600;">${profile.grade ?? "N/A"}</td></tr>
              <tr><td style="padding: 8px 0; color: #6b7280;">Registered</td><td style="padding: 8px 0; font-weight: 600;">${new Date(profile.created_at).toLocaleString()}</td></tr>
            </table>
            <div style="text-align: center; margin-top: 24px;">
              <a href="${approveUrl}" style="display: inline-block; padding: 12px 32px; background: #22c55e; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 12px;">✅ APPROVE USER</a>
              <a href="${rejectUrl}" style="display: inline-block; padding: 12px 32px; background: #ef4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">❌ DECLINE USER</a>
            </div>
            <p style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 16px;">These links expire in 48 hours.</p>
          </div>
        </div>
      `;

      const subject = `New User Registration – Approval Needed: ${profile.full_name}`;
      try {
        await sendEmail(adminEmail, subject, html);
        await supabase.from("email_logs").insert({
          user_id: userId, recipient: adminEmail, subject, email_type: "new_registration", status: "sent",
        });
      } catch (e: any) {
        await supabase.from("email_logs").insert({
          user_id: userId, recipient: adminEmail, subject, email_type: "new_registration",
          status: "failed", error_message: String(e?.message ?? e),
        });
        throw e;
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (type === "approval_notification" || type === "welcome") {
      const { data: authUser } = await supabase.auth.admin.getUserById(userId);
      const userEmail = authUser?.user?.email;

      if (!userEmail || !isValidEmail(userEmail)) {
        return new Response(JSON.stringify({ error: "Invalid user email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, grade, welcome_email_sent")
        .eq("user_id", userId)
        .single();

      const isApproved = accountStatus === "approved" || type === "welcome";
      const loginUrl = Deno.env.get("APP_URL") ? `${Deno.env.get("APP_URL")}/login` : "https://haylat-edtech.app/login";
      const supportEmail = adminEmail;

      if (isApproved) {
        // Dedupe welcome emails
        if (profile?.welcome_email_sent) {
          return new Response(JSON.stringify({ success: true, skipped: "already_sent" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const subject = "🎉 Welcome to Haylat_EdTech – Your Learning Journey Starts Now!";
        const html = welcomeEmailHtml(profile?.full_name || "Student", profile?.grade ?? null, loginUrl, supportEmail);

        try {
          await sendEmail(userEmail, subject, html);
          await supabase.from("email_logs").insert({
            user_id: userId, recipient: userEmail, subject, email_type: "welcome", status: "sent",
          });
          await supabase
            .from("profiles")
            .update({ welcome_email_sent: true, welcome_email_sent_at: new Date().toISOString() })
            .eq("user_id", userId);
        } catch (e: any) {
          await supabase.from("email_logs").insert({
            user_id: userId, recipient: userEmail, subject, email_type: "welcome",
            status: "failed", error_message: String(e?.message ?? e),
          });
          throw e;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        const subject = "Haylat_EdTech Registration Update";
        const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #ef4444, #dc2626); padding: 20px; border-radius: 12px 12px 0 0;">
              <h1 style="color: white; margin: 0;">Registration Update</h1>
            </div>
            <div style="background: #f9fafb; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px;">Hello <strong>${profile?.full_name || "User"}</strong>,</p>
              <p>Unfortunately, your registration has been declined. Please contact support at ${supportEmail} for more information.</p>
            </div>
          </div>`;

        try {
          await sendEmail(userEmail, subject, html);
          await supabase.from("email_logs").insert({
            user_id: userId, recipient: userEmail, subject, email_type: "rejection", status: "sent",
          });
        } catch (e: any) {
          await supabase.from("email_logs").insert({
            user_id: userId, recipient: userEmail, subject, email_type: "rejection",
            status: "failed", error_message: String(e?.message ?? e),
          });
          throw e;
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Invalid type" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Email error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
