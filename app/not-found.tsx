import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-sm text-muted">404</p>
      <h1 className="mt-2 text-3xl font-semibold">This page does not exist</h1>
      <p className="mt-3 text-muted">
        No fire here, only a wrong address. Try the simulator or go back to the start.
      </p>
      <p className="mt-6 flex justify-center gap-6">
        <Link className="link" href="/">Home</Link>
        <Link className="link" href="/simulator">Simulator</Link>
        <Link className="link" href="/references">References</Link>
      </p>
    </div>
  );
}
