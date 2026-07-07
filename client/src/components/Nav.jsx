import { Link, useNavigate } from "react-router-dom";

export default function Nav() {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-hairline/80 bg-parchment/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Veritas Prep" className="h-10 w-10" />
          <span className="font-display text-lg tracking-tight text-ink-900">
            Veritas Prep
          </span>
        </Link>

        <nav className="hidden items-center gap-8 font-body text-sm text-ink-600 md:flex">
          <a href="/#services" className="ink-underline pb-1">Services</a>
          <a href="/#about" className="ink-underline pb-1">About</a>
          <a href="/#faq" className="ink-underline pb-1">FAQ</a>
          <Link to="/credits" className="ink-underline pb-1">Credits</Link>
        </nav>

        <button
          onClick={() => navigate("/apply")}
          className="rounded-sm bg-ink-900 px-5 py-2.5 font-body text-sm font-medium text-parchment transition hover:bg-ink-600"
        >
          Submit Your Application
        </button>
      </div>
    </header>
  );
}
