import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;

async function sendConfirmationEmail(name: string, email: string) {
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

          <tr>
            <td style="padding-bottom:40px;">
              <span style="font-size:20px;font-weight:400;color:#f5f0eb;font-family:Georgia,serif;">Ordo</span>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:24px;">
              <h1 style="margin:0;font-size:32px;font-weight:400;color:#f5f0eb;font-family:Georgia,serif;line-height:1.2;">
                Pre-order confirmed, ${firstName}.
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#908882;">
                Your Ordo pre-order is locked in. You're among the first to get an 18-gram AI copilot behind your ear.
              </p>
              <p style="margin:0 0 16px;font-size:16px;line-height:1.7;color:#908882;">
                We'll keep you updated on development milestones and ship your unit as soon as it's ready.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:32px;">
              <div style="width:60px;height:1px;background:#e8a87c;opacity:0.4;"></div>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:32px;">
              <p style="margin:0 0 12px;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#5a5550;font-family:monospace;">
                Order details
              </p>
              <table cellpadding="0" cellspacing="0" style="width:100%;">
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;">Product</td>
                  <td style="padding:8px 0;font-size:14px;color:#f5f0eb;text-align:right;">Ordo — Pre-Order</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;border-top:1px solid #1c1c1c;">Amount</td>
                  <td style="padding:8px 0;font-size:14px;color:#e8a87c;text-align:right;border-top:1px solid #1c1c1c;">$80.00 USD</td>
                </tr>
                <tr>
                  <td style="padding:8px 0;font-size:14px;color:#908882;border-top:1px solid #1c1c1c;">Status</td>
                  <td style="padding:8px 0;font-size:14px;color:#b8c9a3;text-align:right;border-top:1px solid #1c1c1c;">Paid</td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-bottom:48px;">
              <a href="https://ai.ordospaces.com" style="display:inline-block;padding:14px 32px;background:#e8a87c;color:#0a0a0a;text-decoration:none;border-radius:100px;font-size:14px;font-weight:600;">
                Visit ordospaces.com
              </a>
            </td>
          </tr>

          <tr>
            <td style="border-top:1px solid #1c1c1c;padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#5a5550;">
                &copy; 2026 Ordo &middot; ai.ordospaces.com
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#5a5550;">
                Questions? Reply to this email or reach us at hello@ordospaces.com
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Ordo <hello@ordospaces.com>",
      to: email,
      subject: `Pre-order confirmed, ${firstName}!`,
      html,
    }),
  });
}

Deno.serve(async (req) => {
  try {
    const body = await req.text();
    const event = JSON.parse(body);

    // Only handle completed checkout sessions
    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const session = event.data.object;
    const waitlistId = session.metadata?.waitlist_id;
    const customerEmail = session.customer_email;

    if (!waitlistId) {
      console.error("No waitlist_id in session metadata");
      return new Response(JSON.stringify({ received: true }), { status: 200 });
    }

    // Update waitlist entry
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: entry, error } = await supabase
      .from("waitlist")
      .update({
        paid: true,
        stripe_session_id: session.id,
        amount_paid: session.amount_total || 8000,
      })
      .eq("id", waitlistId)
      .select("name, email")
      .single();

    if (!error && entry) {
      // Send confirmation email
      await sendConfirmationEmail(entry.name, entry.email);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
