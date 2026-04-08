import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Look up the waitlist entry
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: entry, error: lookupError } = await supabase
      .from("waitlist")
      .select("id, name, email, paid")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (lookupError || !entry) {
      return new Response(
        JSON.stringify({ error: "Please join the waitlist first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (entry.paid) {
      return new Response(
        JSON.stringify({ error: "You've already pre-ordered!" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Stripe Checkout Session
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "mode": "payment",
        "customer_email": entry.email,
        "metadata[waitlist_id]": entry.id,
        "metadata[name]": entry.name,
        "line_items[0][price_data][currency]": "usd",
        "line_items[0][price_data][product_data][name]": "Ordo — Pre-Order",
        "line_items[0][price_data][product_data][description]": "AI-powered behind-ear wearable with camera. Early access pre-order.",
        "line_items[0][price_data][unit_amount]": "8000",
        "line_items[0][quantity]": "1",
        "success_url": "https://ai.ordospaces.com/?payment=success",
        "cancel_url": "https://ai.ordospaces.com/?payment=cancelled",
      }).toString(),
    });

    const session = await stripeRes.json();

    if (!stripeRes.ok) {
      console.error("Stripe error:", session);
      return new Response(
        JSON.stringify({ error: "Payment setup failed. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ url: session.url }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({ error: "Invalid request" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
