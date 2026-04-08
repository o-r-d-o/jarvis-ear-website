import Image from "next/image";
import { ScrollReveal } from "./scroll-reveal";

const CASES = [
  {
    tag: "Developer",
    title: "Slack + GitHub",
    desc: "Send DMs, post to channels, create issues, list PRs — without switching context.",
    example: '"Create an issue on ordo — fix auth timeout on mobile"',
    image: "/usecase-developer.png",
    imageAlt: "Developer at desk wearing Ordo device while coding",
    delay: 0.05,
  },
  {
    tag: "Productivity",
    title: "Notes + Calendar",
    desc: "Capture ideas the moment they hit. Schedule meetings while walking. Search notes by voice.",
    example: '"Schedule a call with Raj tomorrow at 3pm"',
    image: "/usecase-walking.png",
    imageAlt: "Person walking through park wearing Ordo device",
    delay: 0.15,
  },
  {
    tag: "Vision",
    title: "Visual AI",
    desc: "Read whiteboards, scan business cards, identify components, translate signs — all through the camera.",
    example: '"What does this circuit board component say?"',
    image: "/usecase-whiteboard.png",
    imageAlt: "Whiteboard with diagrams and sticky notes from Ordo camera view",
    delay: 0.25,
  },
];

export function UseCases() {
  return (
    <section id="use-cases" className="section-divider relative py-24 lg:py-36" aria-labelledby="usecases-heading">
      <div className="mx-auto max-w-[1200px] px-7 lg:px-10">
        <ScrollReveal className="mb-18">
          <p className="section-eyebrow mb-5 flex items-center gap-3 font-mono text-[11px] font-medium uppercase tracking-[3px] text-text-3">Workflows</p>
          <h2 id="usecases-heading" className="section-title font-serif font-normal leading-[1.1] tracking-[-1.5px] text-text">
            Built for <em className="italic text-accent">builders.</em>
          </h2>
          <p className="max-w-[500px] text-[17px] leading-[1.7] text-text-2">
            Ordo integrates with the tools you already use. Voice becomes your fastest input.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {CASES.map((c) => (
            <ScrollReveal key={c.title} className="case-card relative bg-bg-card px-9 py-11" delay={c.delay}>
              {/* Image */}
              <div className="relative mb-7 h-[180px] w-full overflow-hidden rounded-sm">
                <Image
                  src={c.image}
                  alt={c.imageAlt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 33vw"
                />
              </div>

              <div className="mb-5 font-mono text-[9px] uppercase tracking-[2.5px] text-text-3">{c.tag}</div>
              <h3 className="mb-3 font-serif text-[22px] font-normal text-text">{c.title}</h3>
              <p className="mb-6 text-sm leading-[1.65] text-text-2">{c.desc}</p>
              <div className="bg-accent-soft p-3 px-4 font-mono text-[11px] italic leading-relaxed text-accent opacity-50">
                {c.example}
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
