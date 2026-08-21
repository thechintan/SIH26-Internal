export default function TrackReportPage({ params }: { params: { id: string } }) {
  return (
    <main className="flex min-h-screen flex-col items-center p-8 bg-gray-50">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-4">Report #{params.id}</h1>
        <div className="rounded-lg border p-6 bg-white shadow-sm mb-6">
          <h2 className="text-xl font-semibold mb-4">Status Timeline</h2>
          <div className="space-y-4">
            <p className="text-gray-500">Timeline visualization will go here...</p>
            {/* Status Timeline component to be built */}
          </div>
        </div>
      </div>
    </main>
  );
}
