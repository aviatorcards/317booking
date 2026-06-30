"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import React from "react";

// ── Icons ────────────────────────────────────────────────────────────────────

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function MusicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </svg>
  );
}

function CreditCardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function SignOutIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ServerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

// ── Nav definitions ───────────────────────────────────────────────────────────

const BAND_NAV = [
  { href: "/band/dashboard", label: "Dashboard", icon: <HomeIcon /> },
  { href: "/band/gigs", label: "Find Gigs", icon: <MusicIcon /> },
  { href: "/venues", label: "Browse Venues", icon: <BuildingIcon /> },
  { href: "/band/availability", label: "Availability", icon: <CalendarIcon /> },
  { href: "/band/profile", label: "Profile", icon: <UserIcon /> },
  { href: "/band/settings", label: "Settings", icon: <SettingsIcon /> },
];

const VENUE_NAV = [
  { href: "/venue/dashboard", label: "Dashboard", icon: <HomeIcon /> },
  { href: "/bands", label: "Browse Bands", icon: <UserIcon /> },
  { href: "/venue/gigs/new", label: "Post a Gig", icon: <PlusIcon />, exact: true },
  { href: "/venue/profile", label: "Profile", icon: <BuildingIcon /> },
  { href: "/venue/settings", label: "Settings", icon: <SettingsIcon /> },
];

const ADMIN_NAV = [
  { href: "/admin", label: "Overview", icon: <HomeIcon />, exact: true },
  { href: "/admin/users", label: "Users", icon: <UsersIcon /> },
  { href: "/admin/bands", label: "Bands", icon: <MusicIcon /> },
  { href: "/admin/venues", label: "Venues", icon: <BuildingIcon /> },
  { href: "/admin/gigs", label: "Gigs", icon: <CalendarIcon /> },
  { href: "/admin/payments", label: "Payments", icon: <CreditCardIcon /> },
  { href: "/admin/tiers", label: "Pay Tiers", icon: <TagIcon /> },
  { href: "/admin/audit", label: "Audit Log", icon: <ShieldIcon /> },
  { href: "/admin/settings", label: "Settings", icon: <SettingsIcon /> },
  { href: "/admin/technical", label: "Technical", icon: <ServerIcon /> },
];

// ── Venue switcher ────────────────────────────────────────────────────────────

interface VenueEntry { id: string; name: string }

function VenueSwitcher({ venues, activeVenueId, onNavigate }: { venues: VenueEntry[]; activeVenueId?: string; onNavigate: () => void }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const active = venues.find((v) => v.id === activeVenueId) ?? venues[0];

  async function switchTo(id: string) {
    setOpen(false);
    await fetch("/api/venues/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ venueId: id }),
    });
    router.refresh();
  }

  if (venues.length === 0) return null;

  return (
    <div className="px-3 mb-2 relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-brand-50 border border-brand-100 text-sm font-semibold text-brand-900 hover:border-brand-300 transition-colors"
      >
        <span className="truncate">{active?.name ?? "Select venue"}</span>
        <span className="shrink-0 text-brand-300"><ChevronIcon /></span>
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white border border-brand-200 rounded-xl shadow-lg z-50 overflow-hidden">
          {venues.map((v) => (
            <button
              key={v.id}
              onClick={() => switchTo(v.id)}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                v.id === activeVenueId
                  ? "bg-brand-500 text-white"
                  : "text-brand-900 hover:bg-brand-50"
              }`}
            >
              {v.name}
            </button>
          ))}
          <div className="border-t border-brand-100">
            <Link
              href="/venue/venues/new"
              onClick={() => { setOpen(false); onNavigate(); }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-brand-400 hover:bg-brand-50 transition-colors"
            >
              <PlusIcon /> Add venue
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  role: "BAND" | "VENUE" | "ADMIN";
  userName: string;
  userEmail: string;
  venues?: VenueEntry[];
  activeVenueId?: string;
}

export function DashboardSidebar({ role, userName, userEmail, venues, activeVenueId }: Props) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const navItems = role === "BAND" ? BAND_NAV : role === "VENUE" ? VENUE_NAV : ADMIN_NAV;

  // Close drawer on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function isActive(item: { href: string; exact?: boolean }) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-white border-b border-brand-200 flex items-center justify-between px-4">
        <Link href="/" className="font-bold font-heading text-brand-500 text-lg tracking-tight">
          317 Booking
        </Link>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg text-brand-400 hover:bg-brand-50 transition-colors"
          aria-label="Open menu"
        >
          <MenuIcon />
        </button>
      </div>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "w-64 flex flex-col bg-white border-r border-brand-200 h-screen",
          "fixed top-0 left-0 bottom-0 z-50",
          "transition-transform duration-300 ease-in-out",
          "lg:sticky lg:top-0 lg:bottom-auto lg:z-auto lg:translate-x-0 lg:shrink-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-brand-100 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-lg font-bold font-heading text-brand-500 tracking-tight">317 Booking</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1 rounded-lg text-brand-300 hover:bg-brand-50 transition-colors"
            aria-label="Close menu"
          >
            <XIcon />
          </button>
        </div>

        {/* Venue switcher */}
        {role === "VENUE" && venues && venues.length > 0 && (
          <div className="px-0 pt-3">
            <VenueSwitcher venues={venues} activeVenueId={activeVenueId} onNavigate={() => setMobileOpen(false)} />
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? "bg-brand-500 text-white shadow-sm"
                    : "text-brand-400 hover:bg-brand-50 hover:text-brand-900"
                }`}
              >
                <span className={active ? "opacity-100" : "opacity-60"}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-4 py-4 border-t border-brand-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-500 font-bold text-sm shrink-0">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-brand-900 truncate">{userName}</div>
              <div className="text-xs text-brand-300 truncate">{userEmail}</div>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: window.location.origin + "/" })}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-brand-400 hover:bg-brand-50 hover:text-brand-900 transition-colors"
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}
