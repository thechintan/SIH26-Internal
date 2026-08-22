"use client";

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md space-y-6 rounded-xl bg-white p-8 text-center shadow-lg">
        <h1 className="text-3xl font-bold">Welcome to CivicReport</h1>
        <p className="text-gray-600">Please sign in to continue.</p>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Get Started
          <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="text-sm text-gray-500 mt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
