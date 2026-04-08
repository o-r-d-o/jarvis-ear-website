"use client";

import { useState, useEffect, type FormEvent } from "react";
import { ScrollReveal } from "./scroll-reveal";

export function Waitlist() {
  const [step, setStep] = useState<"form" | "preorder" | "success">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");

  // Check for payment return
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      setStep("success");
      history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  async function handleWaitlist(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const form = e.currentTarget;
    const name = (form.elements.namedItem("name") as HTMLInputElement).value.trim();
    const emailVal = (form.elements.namedItem("email") as HTMLInputElement).value.trim().toLowerCase();

    try {
      const res = await fetch("/api/waitlist-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: emailVal }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEmail(emailVal);
        setStep("preorder");
      } else {
        setError(data.error || "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handlePreorder() {
    setLoading(true);

    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Something went wrong");
        setLoading(false);
      }
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  return (
    <section id="waitlist" className="section-divider relative py-24 text-center lg:py-36" aria-labelledby="waitlist-heading">
      <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
        <ScrollReveal className="relative mx-auto max-w-[480px]">
          <div className="waitlist-glow" aria-hidden="true" />
          <p className="section-eyebrow mb-5 flex items-center justify-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[3px] text-text-3">Early Access</p>
          <h2 id="waitlist-heading" className="mb-4 font-serif text-[clamp(32px,4vw,48px)] font-normal tracking-[-1px] text-text">
            Get Ordo <em className="italic text-accent">first.</em>
          </h2>
          <p className="mb-10 text-base leading-[1.65] text-text-2">
            Join the waitlist for early access pricing and dev kit availability.
          </p>

          {/* Step 1: Join Waitlist */}
          {step === "form" && (
            <form onSubmit={handleWaitlist} className="mx-auto flex max-w-[400px] flex-col gap-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="text"
                  name="name"
                  placeholder="Your name"
                  required
                  autoComplete="name"
                  aria-label="Your name"
                  className="waitlist-input flex-1 rounded-xl border border-border-light bg-bg-card px-5 py-4 font-sans text-[15px] text-text outline-none placeholder:text-text-3 transition-[border-color,box-shadow] duration-300"
                />
                <input
                  type="email"
                  name="email"
                  placeholder="you@email.com"
                  required
                  autoComplete="email"
                  aria-label="Email address"
                  className="waitlist-input flex-1 rounded-xl border border-border-light bg-bg-card px-5 py-4 font-sans text-[15px] text-text outline-none placeholder:text-text-3 transition-[border-color,box-shadow] duration-300"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="waitlist-btn relative w-full overflow-hidden rounded-xl bg-accent px-8 py-4 text-[15px] font-semibold text-white transition-[box-shadow,transform,opacity] duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? "Joining..." : "Join Waitlist"}</span>
                <span className="btn-shimmer" aria-hidden="true" />
              </button>
              {error && <p className="min-h-[18px] text-center font-mono text-xs text-[#f87171]" aria-live="polite">{error}</p>}
            </form>
          )}

          {/* Step 2: Pre-order */}
          {step === "preorder" && (
            <div className="mx-auto max-w-[400px] text-center">
              <p className="mb-5 font-serif text-xl italic text-text">You&apos;re on the list! Want to lock in your unit?</p>
              <button
                onClick={handlePreorder}
                disabled={loading}
                className="preorder-btn waitlist-btn relative w-full overflow-hidden rounded-xl bg-accent px-9 py-[18px] text-base font-semibold text-white transition-[box-shadow,transform,opacity] duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? "Redirecting to checkout..." : "Pre-order for $80"}</span>
                <span className="btn-shimmer" aria-hidden="true" />
              </button>
              <p className="mt-3 font-mono text-[11px] tracking-[0.5px] text-text-3">Secure your spot. Ships when ready.</p>
              {error && <p className="mt-2 font-mono text-xs text-[#f87171]" aria-live="polite">{error}</p>}
            </div>
          )}

          {/* Step 3: Success */}
          {step === "success" && (
            <div className="mx-auto max-w-[400px] text-center">
              <p className="mb-3 font-serif text-xl italic text-green">Pre-order confirmed!</p>
              <p className="text-base leading-[1.7] text-text-2">
                Check your email for the confirmation. We&apos;ll keep you updated on development milestones.
              </p>
            </div>
          )}

          {step === "form" && (
            <p className="mt-5 font-mono text-[11px] tracking-[0.5px] text-text-3">
              No spam. We&apos;ll email you once when it ships.
            </p>
          )}
        </ScrollReveal>
      </div>
    </section>
  );
}
