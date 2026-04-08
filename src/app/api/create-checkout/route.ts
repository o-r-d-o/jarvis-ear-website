import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://ai.ordospaces.com";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const { data: entry, error: lookupError } = await supabase
      .from("waitlist")
      .select("id, name, email, paid")
      .eq("email", email.trim().toLowerCase())
      .single();

    if (lookupError || !entry) {
      return NextResponse.json(
        { error: "Please join the waitlist first." },
        { status: 404 },
      );
    }

    if (entry.paid) {
      return NextResponse.json(
        { error: "You've already pre-ordered!" },
        { status: 400 },
      );
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: entry.email,
      metadata: {
        waitlist_id: entry.id,
        name: entry.name,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Ordo — Pre-Order",
              description:
                "AI-powered behind-ear wearable with camera. Early access pre-order.",
            },
            unit_amount: 8000,
          },
          quantity: 1,
        },
      ],
      success_url: `${siteUrl}/?payment=success`,
      cancel_url: `${siteUrl}/?payment=cancelled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("Checkout error:", err);
    return NextResponse.json(
      { error: "Payment setup failed. Please try again." },
      { status: 500 },
    );
  }
}
