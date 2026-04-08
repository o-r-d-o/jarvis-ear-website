import Image from "next/image";

export function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col justify-center overflow-hidden" aria-labelledby="hero-heading">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="hero-gradient" />
        <div className="hero-gradient-2" />
        <div className="hero-grid-lines" />
      </div>

      {/* Main content */}
      <div className="relative z-[1] mx-auto grid max-w-[1200px] grid-cols-1 items-center gap-12 px-6 pt-[120px] pb-16 lg:grid-cols-2 lg:gap-20 lg:px-10 lg:pt-[140px]">
        {/* Text */}
        <div className="order-2 max-w-[560px] lg:order-1">
          {/* Badge */}
          <div className="anim-in mb-9 inline-flex items-center gap-2 rounded-full border border-accent-mid bg-accent-soft px-4 py-1.5 font-mono text-[11px] font-medium uppercase tracking-[1.5px] text-accent" style={{ "--delay": "0s" } as React.CSSProperties}>
            <span className="h-1.5 w-1.5 rounded-full bg-accent" style={{ animation: "pulse 2.5s ease-in-out infinite" }} aria-hidden="true" />
            Pre-orders open
          </div>

          <h1
            id="hero-heading"
            className="anim-in mb-7 font-serif text-[clamp(44px,5.5vw,72px)] font-normal leading-[1.05] tracking-[-2px] text-text"
            style={{ "--delay": "0.1s" } as React.CSSProperties}
          >
            Your AI copilot,<br />
            <em className="italic text-accent">behind your ear.</em>
          </h1>

          <p className="anim-in mb-11 max-w-[440px] text-lg leading-[1.7] text-text-2" style={{ "--delay": "0.2s" } as React.CSSProperties}>
            An 18-gram wearable with a camera that turns voice and vision into action.
            Send messages, create issues, take notes — hands-free.
          </p>

          <div className="anim-in flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-5" style={{ "--delay": "0.3s" } as React.CSSProperties}>
            <a href="#waitlist" className="btn-primary inline-flex items-center rounded-full bg-accent px-9 py-4 text-[15px] font-semibold text-white no-underline">
              <span>Join Waitlist</span>
              <span className="btn-shimmer" aria-hidden="true" />
            </a>
            <a href="#how-it-works" className="btn-ghost relative p-4 pl-2 text-[15px] font-medium text-text-2 no-underline transition-colors hover:text-text">
              See how it works
            </a>
          </div>
        </div>

        {/* Device image */}
        <div className="anim-in order-1 flex items-center justify-center lg:order-2" style={{ "--delay": "0.15s" } as React.CSSProperties}>
          <div className="device-wrapper relative mx-auto w-full max-w-[380px] lg:max-w-[520px]">
            <Image
              src="/hardware.webp"
              alt="Ordo AI earbuds with charging case"
              width={520}
              height={520}
              priority
              className="device-img h-auto w-full"
            />
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="anim-in relative z-[1] mt-auto border-t border-border" style={{ "--delay": "0.4s" } as React.CSSProperties}>
        <div className="mx-auto max-w-[1200px] px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-2 py-8 sm:gap-0">
            <Stat value="18" unit="g" label="Weight" />
            <StatDivider />
            <Stat value="2" unit="MP" label="Camera" />
            <StatDivider />
            <Stat value="8" unit="hr" label="Battery" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, unit, label }: { value: string; unit?: string; label: string }) {
  return (
    <div className="flex flex-col items-center px-6 py-2.5 sm:px-12 sm:py-0">
      <span className="font-serif text-[32px] font-normal tracking-[-1px] text-text">
        {value}
        {unit && <span className="ml-0.5 font-sans text-sm font-medium tracking-normal text-accent">{unit}</span>}
      </span>
      <span className="mt-1.5 font-mono text-[10px] uppercase tracking-[2px] text-text-3">{label}</span>
    </div>
  );
}

function StatDivider() {
  return <div className="hidden h-9 w-px bg-border sm:block" />;
}
