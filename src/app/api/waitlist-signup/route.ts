import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";
import { getResend } from "@/lib/resend";
import { welcomeEmailHtml } from "@/lib/emails/welcome";

export async function POST(request: Request) {
  try {
    const { name, email } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const { error: dbError } = await supabase
      .from("waitlist")
      .insert({ name: name.trim(), email: email.trim().toLowerCase() });

    if (dbError) {
      const status = dbError.code === "23505" ? 409 : 500;
      const message =
        dbError.code === "23505"
          ? "This email is already on the waitlist."
          : "Something went wrong. Please try again.";
      return NextResponse.json({ error: message }, { status });
    }

    // Send welcome email (don't block on failure)
    const firstName = name.trim().split(" ")[0];
    getResend()
      .emails.send({
        from: "Ordo <hello@ordospaces.com>",
        to: email.trim().toLowerCase(),
        subject: `Welcome to Ordo, ${firstName}`,
        html: welcomeEmailHtml(firstName),
      })
      .catch(console.error);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
