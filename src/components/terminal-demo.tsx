"use client";

import { useRef, useEffect } from "react";

const LINES = [
  { prompt: "you", type: "voice", text: '"Send Raj a message on Slack — I\'ll be 10 minutes late to standup"' },
  { prompt: "ordo", type: "response", text: "slack.send_message → #standup → @raj" },
  { prompt: "→", type: "action", text: 'Message sent to Raj: "I\'ll be 10 minutes late to standup"', arrow: true },
  { prompt: "you", type: "voice", text: '"Create a GitHub issue — fix the login timeout on mobile"', gap: true },
  { prompt: "ordo", type: "response", text: "github.create_issue → repo:ordo → label:bug" },
  { prompt: "→", type: "action", text: 'Issue #247 created: "Fix login timeout on mobile"', arrow: true },
  { prompt: "you", type: "voice", text: '"Note: FSRTEK insoles cost 5 to 15 dollars at volume"', gap: true },
  { prompt: "ordo", type: "response", text: "notes.save → tagged: #hardware #pricing" },
  { prompt: "→", type: "action", text: "Note saved.", arrow: true, cursor: true },
];

export function TerminalDemo() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;

    // Set initial state
    linesRef.current.forEach((line, i) => {
      if (line) {
        line.style.opacity = "0";
        line.style.transform = "translateY(8px)";
        line.style.transition = `opacity 0.4s ease ${i * 0.12}s, transform 0.4s ease ${i * 0.12}s`;
      }
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            linesRef.current.forEach((line) => {
              if (line) {
                line.style.opacity = "1";
                line.style.transform = "translateY(0)";
              }
            });
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={terminalRef} className="mx-auto max-w-[720px] overflow-hidden rounded-xl border border-[#1c1c1c] bg-[#0a0a0a]">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-[#1c1c1c] px-6 py-4">
        <span className="h-2 w-2 rounded-full opacity-60" style={{ background: "#ff5f57" }} />
        <span className="h-2 w-2 rounded-full opacity-60" style={{ background: "#febc2e" }} />
        <span className="h-2 w-2 rounded-full opacity-60" style={{ background: "#28c840" }} />
        <span className="ml-2 font-mono text-[11px] tracking-[1px] text-[#5a5550]">ordo</span>
      </div>

      {/* Lines */}
      <div className="p-7">
        {LINES.map((line, i) => (
          <div
            key={i}
            ref={(el) => { if (el) linesRef.current[i] = el; }}
            className={`t-line flex items-baseline gap-3 font-mono text-[12.5px] leading-[1.8] ${line.gap ? "t-gap" : ""}`}
          >
            <span className={`min-w-[48px] shrink-0 select-none ${line.arrow ? "t-arrow" : "t-prompt"}`}>
              {line.prompt}
            </span>
            <span className={line.type === "voice" ? "t-voice" : line.type === "response" ? "t-response" : "t-action"}>
              {line.text}
              {line.cursor && <span className="t-cursor" aria-hidden="true" />}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
