import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone wrap">
      <h1>This page wandered off.</h1>
      <p>Try searching the hub or go back to the homepage.</p>
      <Link className="btn navy" href="/">
        Back to the hub
      </Link>
    </main>
  );
}
