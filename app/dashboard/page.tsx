// app/dashboard/page.tsx
"use client";

import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-white p-4">
      <div className="max-w-xl rounded-xl bg-white p-8 shadow-2xl text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to your Dashboard</h1>
        <p className="mb-6 text-gray-600">
          This is a placeholder dashboard page. Add your user‑specific content here.
        </p>
        <button
          onClick={() => router.replace('/')}
          className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go Home <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
