import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { getResend } from "@/lib/resend";
import { preorderConfirmEmailHtml } from "@/lib/emails/preorder-confirm";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }

    const event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );

    if (event.type !== "checkout.session.completed") {
      return NextResponse.json({ received: true });
    }

    const session = event.data.object;
    const waitlistId = session.metadata?.waitlist_id;

    if (!waitlistId) {
      console.error("No waitlist_id in session metadata");
      return NextResponse.json({ received: true });
    }

    const supabase = createServerClient();
    const { data: entry, error } = await supabase
      .from("waitlist")
      .update({
        paid: true,
        stripe_session_id: session.id,
        amount_paid: session.amount_total ?? 8000,
      })
      .eq("id", waitlistId)
      .select("name, email")
      .single();

    if (!error && entry) {
      const firstName = entry.name.split(" ")[0];
      await getResend().emails.send({
        from: "Ordo <hello@ordospaces.com>",
        to: entry.email,
        subject: `Pre-order confirmed, ${firstName}!`,
        html: preorderConfirmEmailHtml(firstName),
      });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 400 },
    );
  }
}
