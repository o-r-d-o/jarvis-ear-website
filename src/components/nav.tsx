"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      <nav
        className={`nav-main px-6 lg:px-10 ${scrolled ? "scrolled" : ""}`}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex h-full max-w-[1200px] items-center justify-between">
          {/* Logo */}
          <a href="/" className="flex items-center gap-3 font-serif text-xl text-text no-underline">
            <Image src="/ordo.jpg" alt="Ordo logo" width={28} height={28} className="rounded-full object-cover" />
            Ordo
          </a>

          {/* Center links */}
          <div className="hidden gap-10 sm:flex">
            <a href="#features" className="text-[13px] font-medium tracking-wide text-text-3 no-underline transition-colors hover:text-text">Features</a>
            <a href="#how-it-works" className="text-[13px] font-medium tracking-wide text-text-3 no-underline transition-colors hover:text-text">How it works</a>
            <a href="#use-cases" className="text-[13px] font-medium tracking-wide text-text-3 no-underline transition-colors hover:text-text">Use cases</a>
          </div>

          {/* CTA */}
          <a
            href="#waitlist"
            className="nav-cta relative hidden overflow-hidden rounded-full bg-accent px-6 py-2.5 text-[13px] font-semibold text-white no-underline transition-transform hover:-translate-y-px hover:shadow-[0_4px_24px_var(--accent-glow)] sm:inline-flex"
          >
            <span>Join Waitlist</span>
            <span className="nav-cta-shimmer" aria-hidden="true" />
          </a>

          {/* Hamburger */}
          <button
            className={`relative block h-5 w-7 cursor-pointer border-none bg-transparent sm:hidden ${menuOpen ? "active" : ""}`}
            style={{ WebkitAppearance: "none" }}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span className="nav-toggle-line" style={{ top: menuOpen ? "50%" : "4px", transform: menuOpen ? "translateY(-50%) rotate(45deg)" : "none", position: "absolute", left: 0, width: "100%", height: "1.5px", background: "var(--text-2)", transition: "all 0.3s" }} />
            <span className="nav-toggle-line" style={{ bottom: menuOpen ? "50%" : "4px", transform: menuOpen ? "translateY(50%) rotate(-45deg)" : "none", position: "absolute", left: 0, width: "100%", height: "1.5px", background: "var(--text-2)", transition: "all 0.3s" }} />
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      <div
        className={`mobile-menu fixed top-[72px] right-0 left-0 z-[999] flex flex-col gap-6 border-b border-border bg-[rgba(248,245,241,0.97)] px-6 py-8 backdrop-blur-[20px] sm:hidden ${menuOpen ? "open" : ""}`}
      >
        <a href="#features" onClick={closeMenu} className="font-serif text-2xl text-text-2 no-underline transition-colors hover:text-text">Features</a>
        <a href="#how-it-works" onClick={closeMenu} className="font-serif text-2xl text-text-2 no-underline transition-colors hover:text-text">How it works</a>
        <a href="#use-cases" onClick={closeMenu} className="font-serif text-2xl text-text-2 no-underline transition-colors hover:text-text">Use cases</a>
        <a href="#waitlist" onClick={closeMenu} className="inline-block rounded-full bg-accent px-7 py-3.5 text-center text-[15px] font-semibold text-white no-underline">Join Waitlist</a>
      </div>
    </>
  );
}
