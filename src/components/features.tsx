"use client";

import { useCallback, type MouseEvent } from "react";
import { ScrollReveal } from "./scroll-reveal";

import Image from "next/image";

interface Feature {
  icon: string;
  title: string;
  desc: string;
  tag?: string;
  hero?: boolean;
  image?: string;
  imageAlt?: string;
  reversed?: boolean;
  accentClass?: string;
}

const FEATURES: Feature[] = [
  {
    icon: "mic",
    title: "Voice Commands",
    desc: "Speak naturally. Ordo understands context, parses intent, and executes. No wake words, no menus, no friction.",
    tag: "Natural Language",
    hero: true,
    image: "/lifestyle-voice.png",
    imageAlt: "Woman wearing Ordo device while walking through a sunlit city",
  },
  {
    icon: "camera",
    title: "Camera Vision",
    desc: "2MP forward-facing camera sees what you see. Read signs, scan docs, identify objects.",
    accentClass: "text-amber",
  },
  {
    icon: "ai",
    title: "AI Assistant",
    desc: "Powered by frontier LLMs. Ask questions, get summaries, reason through problems.",
  },
  {
    icon: "battery",
    title: "8-Hour Battery",
    desc: "All-day use with camera + voice. 20 min to full charge via USB-C.",
    accentClass: "text-green",
  },
  {
    icon: "bolt",
    title: "Instant Actions",
    desc: "Voice to action in under 2 seconds. Slack, GitHub, Calendar, Notes — no app switching.",
  },
  {
    icon: "feather",
    title: "18 Grams",
    desc: "Lighter than most earbuds. Ni-Ti shape memory ear hook adapts to any ear and stays put all day. You forget it's there.",
    tag: "Featherweight",
    hero: true,
    image: "/closeup-ear-1.png",
    imageAlt: "Close-up of Ordo behind-ear device with camera lens visible",
    reversed: true,
  },
];

function FeatureIcon({ icon, className = "" }: { icon: string; className?: string }) {
  return (
    <div className={`mb-6 h-10 w-10 ${className || "text-accent"}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-6 w-6">
        {icon === "mic" && <><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" /></>}
        {icon === "camera" && <><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></>}
        {icon === "ai" && <><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></>}
        {icon === "battery" && <><rect x="1" y="6" width="22" height="12" rx="2" /><line x1="23" y1="13" x2="23" y2="11" /></>}
        {icon === "bolt" && <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />}
        {icon === "feather" && <><path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" /><line x1="16" y1="8" x2="2" y2="22" /><line x1="17.5" y1="15" x2="9" y2="15" /></>}
      </svg>
    </div>
  );
}

function FeatureCard({
  feature,
  delay,
}: {
  feature: Feature;
  delay: number;
}) {
  const handleMouseMove = useCallback((e: MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(200,118,74,0.06) 0%, var(--bg-card) 60%)`;
  }, []);

  const handleMouseLeave = useCallback((e: MouseEvent<HTMLElement>) => {
    e.currentTarget.style.background = "";
  }, []);

  if (feature.hero) {
    const imageBlock = feature.image ? (
      <div className="relative h-[280px] w-full overflow-hidden rounded-sm">
        <Image
          src={feature.image}
          alt={feature.imageAlt ?? ""}
          fill
          className="object-cover"
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      </div>
    ) : (
      <div className="relative flex h-[280px] w-full items-center justify-center overflow-hidden bg-bg-warm" />
    );

    return (
      <ScrollReveal
        className="feature-card col-span-1 grid min-h-[400px] items-center gap-12 bg-bg-card p-10 lg:col-span-2 lg:grid-cols-2 lg:p-16"
        delay={delay}
      >
        {feature.reversed ? imageBlock : null}
        <div>
          <FeatureIcon icon={feature.icon} className={feature.accentClass} />
          <h3 className="mb-3 font-serif text-2xl font-normal tracking-[-0.5px] text-text">{feature.title}</h3>
          <p className="max-w-[400px] text-[15px] leading-[1.7] text-text-2">{feature.desc}</p>
          {feature.tag && <div className="mt-6 font-mono text-[10px] uppercase tracking-[2px] text-text-3">{feature.tag}</div>}
        </div>
        {!feature.reversed ? imageBlock : null}
      </ScrollReveal>
    );
  }

  return (
    <ScrollReveal
      className="feature-card relative bg-bg-card p-10 lg:p-12"
      delay={delay}
    >
      <div onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className="absolute inset-0" />
      <div className="relative">
        <FeatureIcon icon={feature.icon} className={feature.accentClass} />
        <h3 className="mb-3 font-serif text-xl font-normal tracking-[-0.5px] text-text lg:text-2xl">{feature.title}</h3>
        <p className="max-w-[400px] text-[15px] leading-[1.7] text-text-2">{feature.desc}</p>
      </div>
    </ScrollReveal>
  );
}

export function Features() {
  return (
    <section id="features" className="py-24 lg:py-36" aria-labelledby="features-heading">
      <div className="mx-auto max-w-[1200px] px-7 lg:px-10">
        <ScrollReveal className="mb-18">
          <p className="section-eyebrow mb-5 flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[3px] text-text-3">Capabilities</p>
          <h2 id="features-heading" className="section-title font-serif font-normal leading-[1.1] tracking-[-1.5px] text-text">
            Everything you need,<br /><em className="italic text-accent">nothing you don&apos;t.</em>
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} delay={0.05 + i * 0.05} />
          ))}
        </div>
      </div>
    </section>
  );
}
