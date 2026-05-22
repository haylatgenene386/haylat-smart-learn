import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const action = url.searchParams.get("action");

  if (!token || !action || !["approve", "reject"].includes(action)) {
    return htmlResponse("Invalid Request", "The approval link is invalid.", "#ef4444");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  // Fetch token record
  const { data: tokenRecord, error: tokenError } = await supabase
    .from("registration_tokens")
    .select("*")
    .eq("token", token)
    .single();

  if (tokenError || !tokenRecord) {
    return htmlResponse("Invalid Token", "This approval link is invalid or does not exist.", "#ef4444");
  }

  if (tokenRecord.used) {
    return htmlResponse("Already Used", "This approval link has already been used.", "#f59e0b");
  }

  if (new Date(tokenRecord.expires_at) < new Date()) {
    return htmlResponse("Link Expired", "This approval link has expired. Please use the admin panel to manage this user.", "#f59e0b");
  }

  const newStatus = action === "approve" ? "approved" : "rejected";

  // Update profile status
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ account_status: newStatus })
    .eq("user_id", tokenRecord.user_id);

  if (updateError) {
    console.error("Update error:", updateError);
    return htmlResponse("Error", "Failed to update user status. Please try again.", "#ef4444");
  }

  // Mark token as used
  await supabase
    .from("registration_tokens")
    .update({ used: true })
    .eq("id", tokenRecord.id);

  // Mark sibling tokens as used too
  await supabase
    .from("registration_tokens")
    .update({ used: true })
    .eq("user_id", tokenRecord.user_id)
    .eq("used", false);

  // Send notification email to user
  try {
    await supabase.functions.invoke("send-registration-email", {
      body: { userId: tokenRecord.user_id, type: "approval_notification", status: newStatus },
    });
  } catch (e) {
    console.error("Failed to send notification email:", e);
  }

  if (action === "approve") {
    return htmlResponse(
      "User Approved ✅",
      "The user has been approved and notified. They can now log in to Haylat_EdTech.",
      "#22c55e"
    );
  } else {
    return htmlResponse(
      "User Declined ❌",
      "The user has been declined and notified.",
      "#ef4444"
    );
  }
});

function htmlResponse(title: string, message: string, color: string): Response {
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title} – Haylat_EdTech</title>
    </head>
    <body style="font-family: Arial, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f3f4f6;">
      <div style="text-align: center; max-width: 500px; padding: 40px; background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
        <div style="width: 60px; height: 60px; border-radius: 50%; background: ${color}; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 28px; color: white;">${title.includes("✅") ? "✓" : title.includes("❌") ? "✗" : "!"}</span>
        </div>
        <h1 style="color: #1f2937; font-size: 24px; margin-bottom: 12px;">${title}</h1>
        <p style="color: #6b7280; font-size: 16px; line-height: 1.5;">${message}</p>
        <p style="color: #9ca3af; font-size: 12px; margin-top: 24px;">Haylat_EdTech Admin</p>
      </div>
    </body>
    </html>
  `;
  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
