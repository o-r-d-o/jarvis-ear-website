import Image from "next/image";

export function Footer() {
  return (
    <footer className="relative z-[1] border-t border-border pt-18 pb-12" role="contentinfo">
      <div className="mx-auto max-w-[1200px] px-7 lg:px-10">
        {/* Top */}
        <div className="mb-14 flex flex-col gap-12 lg:flex-row lg:items-start lg:justify-between">
          {/* Brand */}
          <div className="flex items-center gap-3 font-serif text-xl text-text">
            <Image src="/ordo.jpg" alt="Ordo logo" width={28} height={28} className="rounded-full object-cover" />
            Ordo
          </div>

          {/* Columns */}
          <div className="flex flex-col gap-8 sm:flex-row sm:gap-12 lg:gap-18">
            <FooterCol title="Product" links={[
              { label: "Features", href: "#features" },
              { label: "How it works", href: "#how-it-works" },
              { label: "Waitlist", href: "#waitlist" },
            ]} />
            <FooterCol title="Community" links={[
              { label: "X / Twitter", href: "https://x.com/ordospaces", external: true },
              { label: "LinkedIn", href: "https://www.linkedin.com/company/ordospaces/", external: true },
            ]} />
            <FooterCol title="Company" links={[
              { label: "Contact", href: "mailto:support@ordospaces.com" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
              { label: "Refund Policy", href: "/refund" },
            ]} />
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col items-center gap-2 border-t border-border pt-7 text-xs text-text-3 sm:flex-row sm:justify-between">
          <span>&copy; 2026 Ordo</span>
          <span className="font-mono text-[11px] tracking-[0.5px]">ordospaces.com</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="mb-2 font-mono text-[10px] font-semibold uppercase tracking-[2.5px] text-text-3">{title}</h4>
      {links.map((link) => (
        <a
          key={link.label}
          href={link.href}
          className="text-sm text-text-2 no-underline transition-colors hover:text-text"
          {...(link.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {link.label}
        </a>
      ))}
    </div>
  );
}
