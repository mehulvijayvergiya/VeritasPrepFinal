import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";
import { api } from "../lib/api.js";
import { SERVICES, VC_TO_USD } from "../lib/pricing.js";
import { getStudentSession } from "../lib/studentAuth.js";

const METHODS = [
  {
    key: "venmo",
    label: "Venmo",
    handle: "@veritasprepconsulting",
    color: "bg-[#008CFF]",
  },
  {
    key: "zelle",
    label: "Zelle",
    handle: "veritasprepinfo@gmail.com",
    color: "bg-[#6D1ED4]",
  },
];

function PurchaseForm({ prefillEmail }) {
  const [step, setStep] = useState(1); // 1=amount, 2=method+confirm
  const [email, setEmail] = useState(prefillEmail || "");
  const [qty, setQty] = useState(5);
  const [method, setMethod] = useState("venmo");
  const [referral, setReferral] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const usd = qty * VC_TO_USD;
  const chosen = METHODS.find((m) => m.key === method);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.createCreditRequest({
        email,
        amount_usd: usd,
        method,
        note: `Referral: ${referral || "none"}. Note: ${note}`,
      });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-sm border border-hairline bg-white p-8 paper-shadow text-center">
        <p className="font-display text-2xl text-ink-900">Payment submitted ✓</p>
        <p className="mt-3 font-body text-[0.95rem] leading-7 text-ink-600">
          Once we confirm your {chosen?.label} payment of{" "}
          <strong>${usd}</strong>, your{" "}
          <strong>{qty} VC</strong> will be added to your account. This
          usually takes less than an hour during business hours.
        </p>
        <button
          onClick={() => { setDone(false); setStep(1); setQty(5); setEmail(""); setNote(""); setReferral(""); }}
          className="mt-6 font-body text-sm text-ink-900 underline"
        >
          Submit another purchase
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-hairline bg-white p-6 paper-shadow">
      <p className="font-mono text-xs uppercase tracking-widest text-gold-600">
        Purchase Veritas Credits
      </p>

      {step === 1 && (
        <div className="mt-5 space-y-5">
          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">Your email</span>
            <input
              type="email"
              required
              readOnly={Boolean(prefillEmail)}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className={`mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none ${
                prefillEmail ? "bg-parchment text-ink-600" : ""
              }`}
            />
          </label>

          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">
              How many credits?
            </span>
            <p className="mt-0.5 font-body text-xs text-slate-500">1 VC = $10 USD</p>
            <div className="mt-2 flex items-center gap-4">
              <input
                type="number"
                min={1}
                max={100}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Math.min(100, Number(e.target.value))))}
                className="w-24 rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
              />
              <span className="font-body text-sm text-ink-600">
                = <strong>${usd}</strong> USD
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[3, 5, 7, 10, 15].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setQty(n)}
                  className={`rounded-full px-3 py-1.5 font-mono text-xs transition ${
                    qty === n
                      ? "bg-ink-900 text-white"
                      : "bg-parchment text-slate-600 hover:bg-hairline"
                  }`}
                >
                  {n} VC — ${n * VC_TO_USD}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">
              Referral code{" "}
              <span className="font-normal text-slate-500">(optional)</span>
            </span>
            <input
              type="text"
              value={referral}
              onChange={(e) => setReferral(e.target.value.toUpperCase())}
              placeholder="e.g. JSMITH-4K2X"
              className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm uppercase tracking-wider focus:border-ink-900 focus:outline-none"
            />
          </label>

          <button
            disabled={!email || qty < 1}
            onClick={() => setStep(2)}
            className="w-full rounded-sm bg-ink-900 py-3 font-body text-sm font-medium text-white transition hover:bg-ink-600 disabled:opacity-50"
          >
            Continue →
          </button>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="mt-5 space-y-5">
          <div className="rounded-sm bg-parchment p-4">
            <p className="font-body text-sm font-medium text-ink-900">Order summary</p>
            <div className="mt-2 flex justify-between font-body text-sm text-ink-600">
              <span>{qty} Veritas Credits</span>
              <span className="font-medium text-ink-900">${usd} USD</span>
            </div>
            <p className="mt-1 font-body text-xs text-slate-500">{email}</p>
          </div>

          <div>
            <p className="font-body text-sm font-medium text-ink-900">Payment method</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              {METHODS.map((m) => (
                <button
                  key={m.key}
                  type="button"
                  onClick={() => setMethod(m.key)}
                  className={`rounded-sm border-2 px-4 py-3 text-left transition ${
                    method === m.key
                      ? "border-ink-900"
                      : "border-hairline hover:border-ink-400"
                  }`}
                >
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 font-body text-xs font-medium text-white ${m.color}`}
                  >
                    {m.label}
                  </span>
                  <p className="mt-1.5 font-mono text-xs text-ink-900">{m.handle}</p>
                </button>
              ))}
            </div>
            <div className={`mt-3 rounded-sm p-4 ${method === "venmo" ? "bg-blue-50" : "bg-purple-50"}`}>
              <p className="font-body text-sm font-medium text-ink-900">
                Send <strong>${usd}</strong> to{" "}
                <span className="font-mono">{chosen?.handle}</span> via {chosen?.label}
              </p>
              <p className="mt-1 font-body text-xs text-slate-600">
                Use memo: <span className="font-mono">VP Credits — {email}</span>
              </p>
            </div>
          </div>

          <label className="block">
            <span className="font-body text-sm font-medium text-ink-900">
              Confirmation note{" "}
              <span className="font-normal text-slate-500">(optional — e.g. your Venmo username)</span>
            </span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="@yourvenmo or last 4 of Zelle number"
              className="mt-2 w-full rounded-sm border border-hairline px-4 py-2.5 font-body text-sm focus:border-ink-900 focus:outline-none"
            />
          </label>

          {error && (
            <p className="rounded-sm bg-red-50 px-4 py-2.5 font-body text-sm text-red-800">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-sm border border-hairline px-5 py-3 font-body text-sm text-ink-900 hover:bg-parchment"
            >
              ← Back
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-sm bg-ink-900 py-3 font-body text-sm font-medium text-white transition hover:bg-ink-600 disabled:opacity-60"
            >
              {loading ? "Submitting…" : `I've sent $${usd} — confirm my purchase`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function Credits() {
  const [session, setSession] = useState(undefined); // undefined = checking

  useEffect(() => {
    let active = true;
    getStudentSession().then((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div>
      <Nav />

      <section className="mx-auto max-w-5xl px-6 py-16 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-600">
          Veritas Credits
        </p>
        <h1 className="mt-3 font-display text-4xl text-ink-900 sm:text-5xl">
          Simple, transparent pricing.
        </h1>
        <p className="mt-4 max-w-xl font-body text-[1.05rem] leading-7 text-ink-600">
          Buy credits, spend them on exactly what you need. No subscriptions,
          no packages — just pay for the help you actually want.
        </p>

        {/* Pricing table */}
        <div className="mt-10 overflow-hidden rounded-sm border border-hairline">
          <div className="grid grid-cols-[1fr_auto_auto] bg-ink-900 px-6 py-3">
            <span className="font-mono text-xs uppercase tracking-widest text-gold-300">Service</span>
            <span className="font-mono text-xs uppercase tracking-widest text-gold-300 text-right pr-8">Cost</span>
            <span className="font-mono text-xs uppercase tracking-widest text-gold-300 text-right">USD</span>
          </div>
          {SERVICES.map((s, i) => (
            <div
              key={s.key}
              className={`grid grid-cols-[1fr_auto_auto] items-start px-6 py-4 ${
                i < SERVICES.length - 1 ? "border-b border-hairline" : ""
              } bg-white`}
            >
              <div>
                <p className="font-body text-sm font-medium text-ink-900">{s.label}</p>
                <p className="mt-0.5 font-body text-xs text-slate-500">{s.desc}</p>
              </div>
              <div className="pr-8 text-right">
                <span className="rounded-full bg-gold-100 px-2.5 py-0.5 font-mono text-xs text-gold-600">
                  {s.vc} VC
                </span>
              </div>
              <p className="font-body text-sm text-slate-500 text-right">
                ${s.vc * VC_TO_USD}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-3 font-body text-xs text-slate-500">
          1 Veritas Credit = $10 USD &nbsp;·&nbsp; Credits never expire
        </p>

        {/* Purchase credits — requires login */}
        <div className="mt-12 max-w-xl">
          {session === undefined ? null : session ? (
            <PurchaseForm prefillEmail={session.user.email} />
          ) : (
            <div className="rounded-sm border border-hairline bg-white p-6 text-center paper-shadow">
              <p className="font-body text-sm text-ink-600">
                Log in to purchase Veritas Credits.
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block rounded-sm bg-ink-900 px-5 py-2.5 font-body text-sm font-medium text-white transition hover:bg-ink-600"
              >
                Login
              </Link>
            </div>
          )}
        </div>

        {/* Referral callout */}
        <div className="mt-8 rounded-sm border border-gold-300 bg-gold-100/50 px-6 py-5">
          <p className="font-display text-lg text-ink-900">Refer a friend, earn 1 VC.</p>
          <p className="mt-1.5 font-body text-sm text-ink-600">
            Every student you refer who purchases credits earns you 1 free Veritas
            Credit. Find your referral code and current balance in your{" "}
            <Link to="/student/dashboard" className="font-medium text-ink-900 ink-underline">
              student dashboard
            </Link>{" "}
            after signing in.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
