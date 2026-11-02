"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api, Notice, Submit, FileInput } from "./ui";
import { money } from "@/lib/domain";
export function Recovery({ kind }: { kind: "case" | "booking" }) {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  return (
    <details className="recovery-panel">
      <summary>Already submitted? Recover your private {kind} link.</summary>
      <form
        className="stack-form"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            const v = await api("recover", {
              ...Object.fromEntries(new FormData(e.currentTarget)),
              kind,
            });
            setMessage(v.message);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Reference number
          <input
            name="reference"
            required
            placeholder={kind === "case" ? "SCF-…" : "TRP-…"}
            maxLength={40}
          />
        </label>
        <label>
          Email used for this request
          <input name="email" type="email" required />
        </label>
        {message && <Notice>{message}</Notice>}
        {error && <Notice error>{error}</Notice>}
        <Submit busy={busy}>Send a fresh link</Submit>
      </form>
    </details>
  );
}
export function PrivateThread({
  kind,
  reference,
}: {
  kind: "case" | "booking";
  reference: string;
}) {
  const [data, setData] = useState<any>(null),
    [secret, setSecret] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [file, setFile] = useState("");
  const path = `${kind === "case" ? "cases" : "bookings"}/${reference}`;
  async function load() {
    try {
      setData(await api(path));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("token");
    if (token) {
      setSecret(token);
      setLoading(false);
    } else void load();
  }, []);
  async function action(payload: unknown) {
    setBusy(true);
    setError("");
    try {
      await api(path, payload);
      setMessage("Your update has been saved.");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const r = data?.record;
  return (
    <>
      <div className="utility">
        <div className="wrap">
          SCF STUDENTS’ HUB · PRIVATE {kind.toUpperCase()}
        </div>
      </div>
      <main className="wrap private-page">
        <Link className="link" href="/">
          Back to the hub
        </Link>
        <h1>{kind === "case" ? "Your SCF case." : "Your journey home."}</h1>
        <p className="reference-number">{reference}</p>
        {secret && !data && (
          <section className="private-gate">
            <h2>Open your private {kind}.</h2>
            <p>
              This verifies your email and opens a private session on this
              browser. Keep this link to yourself.
            </p>
            <button
              className="btn navy"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api("access", { kind, reference, token: secret });
                  window.history.replaceState({}, "", window.location.pathname);
                  setSecret("");
                  await load();
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Opening…" : "Open my private page"}
            </button>
          </section>
        )}
        {loading && <p role="status">Loading your private page…</p>}
        {error && <Notice error>{error}</Notice>}
        {message && <Notice>{message}</Notice>}
        {r && (
          <>
            <div className="private-summary">
              <span className={`status status-${r.status}`}>
                {r.status.replaceAll("_", " ")}
              </span>
              {kind === "case" ? (
                <>
                  <h2>{r.subject}</h2>
                  <p>
                    {r.category}
                    {r.hostel && ` · ${r.hostel}`}
                    {r.location && ` · ${r.location}`}
                  </p>
                  <p>
                    Handling your case:{" "}
                    {data.assignee || "Waiting for an available SCF member"}
                  </p>
                </>
              ) : (
                <>
                  <h2>{data.trip.title}</h2>
                  <p>
                    {new Date(data.trip.departure_at).toLocaleString("en-NG", {
                      timeZone: "Africa/Lagos",
                    })}{" "}
                    · {data.trip.meeting_point}
                  </p>
                  <p>
                    Fare: <strong>{money(data.trip.fare)}</strong>
                  </p>
                  {r.status === "confirmed" && (
                    <Notice>
                      Your payment has been verified and your seat is confirmed.
                    </Notice>
                  )}
                  {r.officer_note && (
                    <Notice>Transport officer: {r.officer_note}</Notice>
                  )}
                </>
              )}
            </div>
            {kind === "case" ? (
              <>
                <div className="thread-messages">
                  {data.messages.map((m: any) => (
                    <article
                      key={m.id}
                      className={`thread-message ${m.from_student ? "student" : "officer"}`}
                    >
                      <div>
                        <strong>{m.from_student ? "You" : "SCF"}</strong>
                        <time>
                          {new Date(m.created_at).toLocaleString("en-NG", {
                            timeZone: "Africa/Lagos",
                          })}
                        </time>
                      </div>
                      <p>{m.body}</p>
                    </article>
                  ))}
                </div>
                {r.status !== "closed" && (
                  <form
                    className="stack-form"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = e.currentTarget;
                      await action({ message: new FormData(f).get("message") });
                      f.reset();
                    }}
                  >
                    <label>
                      Add a follow-up
                      <textarea
                        name="message"
                        required
                        minLength={2}
                        maxLength={5000}
                        rows={4}
                      />
                    </label>
                    <Submit busy={busy}>Send follow-up</Submit>
                  </form>
                )}
              </>
            ) : (
              <>
                {["pending_receipt", "rejected", "pending"].includes(
                  r.status,
                ) && (
                  <section className="detail-body-panel">
                    <h2>Payment & receipt.</h2>
                    {data.settings.bank_name &&
                    data.settings.bank_account_number ? (
                      <>
                        <dl className="bank-details">
                          <div>
                            <dt>Bank</dt>
                            <dd>{data.settings.bank_name}</dd>
                          </div>
                          <div>
                            <dt>Account name</dt>
                            <dd>{data.settings.bank_account_name}</dd>
                          </div>
                          <div>
                            <dt>Account number</dt>
                            <dd>{data.settings.bank_account_number}</dd>
                          </div>
                          <div>
                            <dt>Amount</dt>
                            <dd>{money(data.trip.fare)}</dd>
                          </div>
                        </dl>
                        <p>
                          Use {reference} as your transfer reference. A
                          transport officer must verify the payment before
                          confirming your seat.
                        </p>
                        <FileInput
                          purpose="receipt"
                          reference={reference}
                          value={file || r.receipt_id || ""}
                          onChange={(id) => setFile(id)}
                        />
                        {file && (
                          <button
                            className="btn navy"
                            disabled={busy}
                            onClick={() =>
                              action({ action: "receipt", file_id: file })
                            }
                          >
                            Submit receipt for verification
                          </button>
                        )}
                      </>
                    ) : (
                      <Notice>
                        Payment details are not available yet. Contact SCF
                        before paying.
                      </Notice>
                    )}
                  </section>
                )}
                {r.status !== "cancelled" && (
                  <section className="cancellation-panel">
                    <h2>Need to cancel?</h2>
                    <p>{data.settings.transport_terms}</p>
                    {r.cancellation_requested ? (
                      <Notice>
                        Your cancellation request is with the transport team.
                      </Notice>
                    ) : (
                      <button
                        className="btn outline"
                        disabled={busy}
                        onClick={() => action({ action: "cancel" })}
                      >
                        Request cancellation
                      </button>
                    )}
                  </section>
                )}
              </>
            )}
          </>
        )}
        {!loading && !data && <Recovery kind={kind} />}
      </main>
    </>
  );
}
