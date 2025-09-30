export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="h-16 text-3xl font-bold mb-4 text-shadow-lg" >Welcome to Asset Tracking</h1>
        <a
          href="/scan"
          className="px-6 py-3 bg-red-600 text-white rounded-lg shadow hover:bg-red-700"
        >
          Go to Scanner
        </a>
      </div>
    </main>
  );
}
