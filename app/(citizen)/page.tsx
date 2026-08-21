import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <h1 className="text-4xl font-bold">CivicReport</h1>
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4">
          Report a civic issue in 45 seconds
        </p>
      </div>

      <div className="relative flex place-items-center">
        {/* Placeholder for Map and Live Counter */}
        <div className="text-center">
          <p className="mb-4 text-lg">1,284 issues reported &middot; 891 resolved</p>
          <Link
            href="/report"
            className="rounded-md bg-blue-600 px-8 py-3 text-white font-semibold shadow hover:bg-blue-700 transition-colors"
          >
            Report an Issue
          </Link>
        </div>
      </div>

      <div className="mb-32 grid text-center lg:mb-0 lg:w-full lg:max-w-5xl lg:grid-cols-4 lg:text-left">
        <Link
          href="/my-reports"
          className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
        >
          <h2 className="mb-3 text-2xl font-semibold">
            Track {" "}
            <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">
              -&gt;
            </span>
          </h2>
          <p className="m-0 max-w-[30ch] text-sm opacity-50">
            Check the status of your reported issues.
          </p>
        </Link>
      </div>
    </main>
  );
}
