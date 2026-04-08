"use client";

import { useRef, useEffect } from "react";

export function LifestyleBreak() {
  const bgRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wordsRef = useRef<HTMLParagraphElement>(null);

  // bgRef kept for potential future parallax
  void bgRef;

  // Word-by-word reveal
  useEffect(() => {
    const el = wordsRef.current;
    if (!el) return;

    const text = el.textContent?.trim() ?? "";
    el.innerHTML = text
      .split(/\s+/)
      .map((word) => `<span class="word">${word}</span>`)
      .join(" ");

    const words = el.querySelectorAll<HTMLSpanElement>(".word");

    const updateWords = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      const progress = Math.max(0, Math.min(1, 1 - rect.top / (viewH * 0.7)));
      const litCount = Math.floor(progress * words.length);
      words.forEach((w, i) => w.classList.toggle("lit", i < litCount));
    };

    const onScroll = () => requestAnimationFrame(updateWords);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            window.addEventListener("scroll", onScroll, { passive: true });
            updateWords();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(el);

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex items-center justify-center overflow-hidden py-24 lg:py-32"
      aria-label="Brand statement"
    >
      <div ref={bgRef} className="absolute inset-0 bg-bg-elevated" aria-hidden="true" />
      <div className="relative z-[1] max-w-[700px] px-10 text-center">
        <p
          ref={wordsRef}
          className="word-reveal mb-5 font-serif text-[clamp(24px,4vw,48px)] font-normal italic leading-[1.2] tracking-[-1px] text-text"
        >
          70% of your day happens away from a keyboard. We&apos;re building an AI that lives in those moments.
        </p>
        <p className="font-mono text-[11px] uppercase tracking-[2px] text-text-3">The Ordo philosophy</p>
      </div>
    </section>
  );
}
