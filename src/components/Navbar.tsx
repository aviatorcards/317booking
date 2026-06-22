"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Hide navbar on auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/register")) return null;

  const role = session?.user?.role;

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-indigo-600 tracking-tight">
          317 Booking
        </Link>

        <div className="flex items-center gap-2">
          {status === "loading" ? null : session ? (
            <>
              {role === "BAND" && (
                <>
                  <Link href="/band/dashboard" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Dashboard
                  </Link>
                  <Link href="/band/availability" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Availability
                  </Link>
                  <Link href="/gigs" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Browse Gigs
                  </Link>
                </>
              )}
              {role === "VENUE" && (
                <>
                  <Link href="/venue/dashboard" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Dashboard
                  </Link>
                  <Link href="/venue/gigs/new" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Post a Gig
                  </Link>
                </>
              )}
              {role === "ADMIN" && (
                <>
                  <Link href="/admin" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Admin
                  </Link>
                  <Link href="/admin/tiers" className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2">
                    Pay Tiers
                  </Link>
                </>
              )}
              <span className="text-xs text-gray-400 px-2">{session.user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="btn-secondary text-xs"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Log in
              </Link>
              <Link href="/register" className="btn-primary">
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
