"use client";

import { ChevronDown, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { WEBSITE_URL } from "@/lib/external-links";
import { cn } from "@/lib/utils";

/** Free tools live in the panel; everything else points at the site. */
const TOOLS = [
  {
    description: "Score, rankings and what to fix in every market - no account, shareable link.",
    href: "/aso-check",
    label: "ASO check-up",
  },
  {
    description: "How hard is any keyword, and who owns it today.",
    href: "/keyword-check",
    label: "Keyword difficulty checker",
  },
  {
    description: "Turn raw screenshots into store-ready graphics.",
    href: "/editor",
    label: "Screenshot editor",
  },
];

const SITE_LINKS = [
  { href: `${WEBSITE_URL}/#tour`, label: "Product" },
  { href: `${WEBSITE_URL}/pricing`, label: "Pricing" },
  { href: `${WEBSITE_URL}/docs`, label: "Docs" },
  { href: `${WEBSITE_URL}/blog`, label: "Blog" },
];

export function ToolsMenu({
  compact = false,
  pathname,
}: {
  compact?: boolean;
  pathname: string;
}) {
  const [open, setOpen] = useState(false);
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!groupRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setOpen(false);
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      ref={groupRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={cn(
          "flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground",
          compact ? "text-xs" : "text-sm",
        )}
        onClick={() => setOpen((v) => !v)}
        onFocus={() => setOpen(true)}
        type="button"
      >
        Free tools
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
        />
      </button>
      <div
        className={cn(
          "absolute top-full z-50 w-80 pt-3",
          // Centered under the trigger in the header; left-aligned in the
          // editor toolbar, where the button sits near the screen edge and a
          // centered panel would be clipped.
          compact ? "left-0" : "left-1/2 -translate-x-1/2",
          !open && "hidden",
        )}
      >
        <div className="rounded-xl border bg-background/95 p-2 shadow-xl backdrop-blur">
          {TOOLS.map((tool) => (
            <Link
              className={cn(
                "block rounded-lg px-3 py-2.5 transition-colors hover:bg-muted",
                pathname === tool.href && "bg-muted",
              )}
              href={tool.href}
              key={tool.href}
              onClick={() => setOpen(false)}
            >
              <span className="block text-sm font-medium">{tool.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {tool.description}
              </span>
            </Link>
          ))}
          {compact && (
            <div className="mt-1 border-t pt-1">
              {SITE_LINKS.map((link) => (
                <a
                  className="block rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              ))}
              <Link
                className="block rounded-lg px-3 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
                href="/register"
              >
                Create free account
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Marketing-style header for the panel's public tools (/aso-check,
 * /keyword-check): the same navigation visitors know from appboard.dev, so a
 * free tool never feels like a dead end.
 */
export function PublicSiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a className="flex items-center gap-2" href={WEBSITE_URL}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt="AppBoard"
            className="h-6 w-5 object-contain"
            src="/appboard-logo.svg"
          />
          <span className="text-base font-semibold tracking-tight">
            AppBoard
          </span>
        </a>

        <nav className="hidden items-center gap-7 md:flex">
          <ToolsMenu pathname={pathname} />
          {SITE_LINKS.map((link) => (
            <a
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
              href={link.href}
              key={link.href}
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/register">Get started free</Link>
          </Button>
        </div>

        <Button
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="md:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          size="icon"
          variant="ghost"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t md:hidden">
          <nav className="flex flex-col gap-1 px-4 py-4">
            <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Free tools
            </p>
            {TOOLS.map((tool) => (
              <Link
                className="rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                href={tool.href}
                key={tool.href}
                onClick={() => setMobileOpen(false)}
              >
                {tool.label}
              </Link>
            ))}
            <div className="mt-2 border-t pt-2">
              {SITE_LINKS.map((link) => (
                <a
                  className="block rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  href={link.href}
                  key={link.href}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 border-t pt-4">
              <Button asChild variant="outline">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild>
                <Link href="/register">Get started free</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
