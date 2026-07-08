import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-hairline bg-ink-900 text-ink-100">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="Veritas Prep" className="h-9 w-9 opacity-95" />
              <span className="font-display text-lg text-white">Veritas Prep</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-ink-100/70">
              Authentic stories. Stronger applications. Built by a Cornell '30 CS student
              who reads essays for a living.
            </p>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-300">Services</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-100/80">
              <li>Essay Review</li>
              <li>Activities List Feedback</li>
              <li>Full Application Review</li>
              <li>1:1 Mentorship</li>
            </ul>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-300">Veritas Prep</p>
            <ul className="mt-3 space-y-2 text-sm text-ink-100/80">
              <li><Link to="/apply" className="ink-underline">Submit an application</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-ink-100/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Veritas Prep. All rights reserved.</p>
          <p>Founded by a Cornell '30 Computer Science student.</p>
        </div>
      </div>
    </footer>
  );
}
