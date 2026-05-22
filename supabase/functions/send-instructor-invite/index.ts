import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Only super admins can invite instructors" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, courseId, resend } = await req.json();

    if (!email || !courseId) {
      return new Response(JSON.stringify({ error: "Email and courseId are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let invitation: any;

    if (resend) {
      // Find existing pending invitation to resend
      const { data: existingInvite, error: findErr } = await supabase
        .from("instructor_invitations")
        .select("*")
        .eq("email", email)
        .eq("course_id", courseId)
        .eq("status", "pending")
        .single();

      if (findErr || !existingInvite) {
        return new Response(JSON.stringify({ error: "No pending invitation found to resend" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Refresh expiration
      const { data: updated, error: updateErr } = await supabase
        .from("instructor_invitations")
        .update({ expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
        .eq("id", existingInvite.id)
        .select()
        .single();

      if (updateErr) throw updateErr;
      invitation = updated;
    } else {
      // Check if invitation already exists (pending only)
      const { data: existingInvite } = await supabase
        .from("instructor_invitations")
        .select("id")
        .eq("email", email)
        .eq("course_id", courseId)
        .eq("status", "pending")
        .single();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: "An invitation for this email and course already exists" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create the invitation
      const { data: newInvite, error: inviteError } = await supabase
        .from("instructor_invitations")
        .insert({
          email,
          course_id: courseId,
          invited_by: user.id,
        })
        .select()
        .single();

      if (inviteError) throw inviteError;
      invitation = newInvite;
    }

    // Get course info
    const { data: course } = await supabase
      .from("courses")
      .select("title")
      .eq("id", courseId)
      .single();

    // Get platform settings for branding
    const { data: settings } = await supabase
      .from("platform_settings")
      .select("platform_name")
      .single();

    const platformName = settings?.platform_name || "Haylat EdTech";
    const appUrl = Deno.env.get("APP_URL") || req.headers.get("origin") || "https://haylat-edtech.app";
    const inviteLink = `${appUrl}/accept-invite?token=${invitation.token}`;
    const declineLink = `${appUrl}/accept-invite?token=${invitation.token}&action=decline`;
    const courseName = course?.title || "a course";

    // Send email via Resend if API key is available
    let emailSent = false;
    if (resendApiKey) {
      try {
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${platformName} <onboarding@resend.dev>`,
            to: [email],
            subject: `You're invited to teach "${courseName}" on ${platformName}`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; padding: 20px 0; border-bottom: 2px solid #6366f1;">
                  <h1 style="color: #1a1a2e; margin: 0; font-size: 24px;">${platformName}</h1>
                </div>
                <div style="padding: 30px 0;">
                  <h2 style="color: #1a1a2e; font-size: 20px;">You've Been Invited!</h2>
                  <p style="color: #555; font-size: 16px; line-height: 1.6;">
                    You have been invited to join <strong>${platformName}</strong> as an instructor for the course:
                  </p>
                  <div style="background: #f4f4f8; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
                    <p style="color: #6366f1; font-size: 18px; font-weight: bold; margin: 0;">${courseName}</p>
                  </div>
                  <p style="color: #555; font-size: 16px; line-height: 1.6;">
                    As an instructor, you'll be able to manage course materials and generate AI-powered questions for your students.
                  </p>
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${inviteLink}" style="display: inline-block; background: #6366f1; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold; margin-right: 12px;">
                      ✅ Accept Invitation
                    </a>
                    <a href="${declineLink}" style="display: inline-block; background: #ef4444; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: bold;">
                      ❌ Decline
                    </a>
                  </div>
                  <p style="color: #999; font-size: 13px; text-align: center;">
                    This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
                  </p>
                </div>
                <div style="border-top: 1px solid #eee; padding-top: 16px; text-align: center;">
                  <p style="color: #999; font-size: 12px;">© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p>
                </div>
              </div>
            `,
          }),
        });

        if (emailResponse.ok) {
          emailSent = true;
        } else {
          const errData = await emailResponse.json();
          console.error("Resend error:", errData);
        }
      } catch (emailErr) {
        console.error("Failed to send email:", emailErr);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        invitation,
        inviteLink,
        courseName,
        emailSent,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
