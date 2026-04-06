export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center space-y-4">
        <div className="text-6xl">🏨</div>
        <h1 className="text-2xl font-semibold text-stone-800">Hotel Services</h1>
        <p className="text-stone-500 text-sm">
          Scan the QR code in your room to request services.
        </p>
        <p className="text-stone-400 text-xs mt-8">
          Staff?{" "}
          <a href="/staff/login" className="text-brand-600 underline">
            Sign in here
          </a>
        </p>
      </div>
    </main>
  );
}
