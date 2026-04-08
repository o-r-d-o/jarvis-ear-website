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

    const normalizedEmail = email.trim().toLowerCase();
    const supabase = createServerClient();

    // Look up the waitlist entry — it may not exist yet if signup is still in flight
    const { data: entry } = await supabase
      .from("waitlist")
      .select("id, name, email, paid")
      .eq("email", normalizedEmail)
      .single();

    if (entry?.paid) {
      return NextResponse.json(
        { error: "You've already pre-ordered!" },
        { status: 400 },
      );
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: normalizedEmail,
      metadata: {
        waitlist_id: entry?.id ?? "",
        name: entry?.name ?? "",
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
    const message = err instanceof Error ? err.message : String(err);
    console.error("Checkout error:", message);
    return NextResponse.json(
      { error: "Payment setup failed. Please try again." },
      { status: 500 },
    );
  }
}
