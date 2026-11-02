"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="standalone wrap">
      <h1>The hub couldn’t load.</h1>
      <p>Please check your connection and try again.</p>
      <button className="btn navy" onClick={reset}>
        Try again
      </button>
      <a className="link" href="/ask-scf">
        Ask SCF
      </a>
    </main>
  );
}
