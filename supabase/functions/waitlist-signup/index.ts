import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function sendWelcomeEmail(name: string, email: string) {
  const firstName = name.split(" ")[0];

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:48px 24px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#0a0a0a;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-size:20px;font-weight:400;color:#f5f0eb;font-family:Georgia,serif;">Ordo</span>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:32px;font-weight:400;color:#f5f0eb;font-family:Georgia,serif;line-height:1.2;">
                Welcome, ${firstName}.
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#908882;">
                You're on the Ordo waitlist. We're building an 18-gram AI wearable with a camera that turns voice and vision into action — no screen needed.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#908882;">
                When we're ready to ship, you'll be the first to know. Early access members get priority pricing and dev kit availability.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding-bottom:32px;">
              <div style="width:60px;height:1px;background:#e8a87c;opacity:0.4;"></div>
            </td>
          </tr>

          <!-- What's next -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5550;font-family:monospace;">
                What you signed up for
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;">Early access pricing</td>
                  <td style="padding:8px 0;font-size:14px;color:#e8a87c;text-align:right;">Confirmed</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;border-top:1px solid #1c1c1c;">Dev kit priority</td>
                  <td style="padding:8px 0;font-size:14px;color:#e8a87c;text-align:right;border-top:1px solid #1c1c1c;">Confirmed</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;border-top:1px solid #1c1c1c;">Product updates</td>
                  <td style="padding:8px 0;font-size:14px;color:#e8a87c;text-align:right;border-top:1px solid #1c1c1c;">Confirmed</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding-bottom:48px;">
              <a href="https://ai.ordospaces.com" style="display:inline-block;padding:14px 32px;background:#e8a87c;color:#0a0a0a;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
                Visit ordospaces.com
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="border-top:1px solid #1c1c1c;padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#5a5550;">
                &copy; 2026 Ordo &middot; ai.ordospaces.com
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#5a5550;">
                You're receiving this because you joined the Ordo waitlist.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ordo <hello@ordospaces.com>",
      to: email,
      subject: `Welcome to Ordo, ${firstName}`,
      html,
    }),
  });

  return res.ok;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name, email } = await req.json();

    if (!name || !email) {
      return new Response(
        JSON.stringify({ error: "Name and email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save to database
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ name: name.trim(), email: email.trim().toLowerCase() });

    if (dbError) {
      const status = dbError.code === "23505" ? 409 : 500;
      const message = dbError.code === "23505"
        ? "This email is already on the waitlist."
        : "Something went wrong. Please try again.";
      return new Response(
        JSON.stringify({ error: message }),
        { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send welcome email (don't block on failure)
    sendWelcomeEmail(name.trim(), email.trim().toLowerCase()).catch(console.error);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
