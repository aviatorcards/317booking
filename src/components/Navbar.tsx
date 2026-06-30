"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import React from "react";

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
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/band/") ||
    pathname.startsWith("/venue/") ||
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) return null;

  const role = session?.user?.role;

  const desktopLinks = status === "loading" ? null : session ? (
    <>
      {role === "BAND" && (
        <>
          <Link href="/band/dashboard" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Dashboard</Link>
          <Link href="/band/availability" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Availability</Link>
          <Link href="/gigs" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Browse Gigs</Link>
          <Link href="/venues" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Browse Venues</Link>
        </>
      )}
      {role === "VENUE" && (
        <>
          <Link href="/venue/dashboard" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Dashboard</Link>
          <Link href="/bands" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Browse Bands</Link>
          <Link href="/venue/gigs/new" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Post a Gig</Link>
        </>
      )}
      {role === "ADMIN" && (
        <>
          <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Admin</Link>
          <Link href="/admin/tiers" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">Pay Tiers</Link>
        </>
      )}
      <span className="text-xs text-gray-400 px-2">{session.user.email}</span>
      <button
        onClick={() => signOut({ callbackUrl: window.location.origin + "/" })}
        className="btn-secondary text-xs"
      >
        Sign out
      </button>
    </>
  ) : (
    <>
      <Link href="/login" className="btn-secondary">Log in</Link>
      <Link href="/register" className="btn-primary">Sign up</Link>
    </>
  );

  const mobileLinks = status === "loading" ? null : session ? (
    <div className="py-2 space-y-0.5">
      {role === "BAND" && (
        <>
          <Link href="/band/dashboard" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</Link>
          <Link href="/band/availability" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Availability</Link>
          <Link href="/gigs" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Browse Gigs</Link>
          <Link href="/venues" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Browse Venues</Link>
        </>
      )}
      {role === "VENUE" && (
        <>
          <Link href="/venue/dashboard" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Dashboard</Link>
          <Link href="/bands" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Browse Bands</Link>
          <Link href="/venue/gigs/new" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Post a Gig</Link>
        </>
      )}
      {role === "ADMIN" && (
        <>
          <Link href="/admin" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Admin</Link>
          <Link href="/admin/tiers" className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 rounded-lg">Pay Tiers</Link>
        </>
      )}
      <div className="border-t border-gray-100 mt-2 pt-2 px-4">
        <div className="text-xs text-gray-400 mb-2">{session.user.email}</div>
        <button
          onClick={() => signOut({ callbackUrl: window.location.origin + "/" })}
          className="btn-secondary text-xs w-full"
        >
          Sign out
        </button>
      </div>
    </div>
  ) : (
    <div className="py-2 px-4 space-y-2">
      <Link href="/login" className="btn-secondary w-full block text-center">Log in</Link>
      <Link href="/register" className="btn-primary w-full block text-center">Sign up</Link>
    </div>
  );

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-brand-500 tracking-tight font-heading">
          317 Booking
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-2">
          {desktopLinks}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <XIcon /> : <MenuIcon />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-2 pb-2">
          {mobileLinks}
        </div>
      )}
    </nav>
  );
}
