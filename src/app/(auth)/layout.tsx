export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <div className="mb-8 text-center">
        <a href="/" className="text-2xl font-bold text-indigo-600">317 Booking</a>
      </div>
      {children}
    </div>
  );
}
