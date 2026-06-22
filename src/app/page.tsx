import Link from "next/link";

export default function Home() {
  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Hero */}
      <section className="py-24 text-center">
        <h1 className="text-5xl font-bold text-gray-900 mb-4 tracking-tight">
          Book bands.<br />
          <span className="text-indigo-600">No middlemen.</span>
        </h1>
        <p className="text-xl text-gray-500 max-w-xl mx-auto mb-10">
          317 Booking connects Indianapolis venues with bands directly — transparent pay scales, no bookers taking your cut.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/register?role=VENUE" className="btn-primary text-base px-6 py-3">
            I&apos;m a Venue
          </Link>
          <Link href="/register?role=BAND" className="btn-secondary text-base px-6 py-3">
            I&apos;m a Band
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-gray-100">
        <h2 className="text-2xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card text-center">
            <div className="text-3xl mb-4">📅</div>
            <h3 className="font-semibold text-lg mb-2">Bands set availability</h3>
            <p className="text-gray-500 text-sm">
              Each month, bands mark the dates they&apos;re free. Locked before the month starts so venues know who&apos;s actually available.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-4">🎫</div>
            <h3 className="font-semibold text-lg mb-2">Venues post gigs</h3>
            <p className="text-gray-500 text-sm">
              Post a gig with a fixed pay tier — no negotiating, no surprises. Bands see exactly what they&apos;ll earn before claiming.
            </p>
          </div>
          <div className="card text-center">
            <div className="text-3xl mb-4">💸</div>
            <h3 className="font-semibold text-lg mb-2">Get paid automatically</h3>
            <p className="text-gray-500 text-sm">
              Payment deposits on booking. 24 hours after the show, funds transfer directly to the band. Zero booker fees.
            </p>
          </div>
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-16 text-center">
        <p className="text-gray-400 text-sm">Indianapolis, Indiana · 317 area code · Built for the local scene</p>
      </section>
    </div>
  );
}
