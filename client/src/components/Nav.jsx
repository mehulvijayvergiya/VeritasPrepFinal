import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getStudentSession, onStudentAuthStateChange, logoutStudent } from "../lib/studentAuth.js";
import { api } from "../lib/api.js";

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4.5 19.2c1.4-3.2 4.2-5 7.5-5s6.1 1.8 7.5 5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Nav() {
  const navigate = useNavigate();
  const [session, setSession] = useState(undefined); // undefined = checking, null = anon
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    let active = true;
    getStudentSession().then((s) => {
      if (active) setSession(s);
    });
    const subscription = onStudentAuthStateChange((s) => {
      if (active) setSession(s);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    if (session) {
      api
        .getStudentMe(session.access_token)
        .then(({ profile }) => {
          if (active) setProfile(profile);
        })
        .catch(() => {
          if (active) setProfile(null);
        });
    } else {
      setProfile(null);
    }
    return () => {
      active = false;
    };
  }, [session]);

  async function handleSignOut() {
    await logoutStudent();
    navigate("/");
  }

  const firstName = profile?.full_name ? profile.full_name.split(" ")[0] : null;

  return (
    <header className="sticky top-0 z-40 border-b border-hairline/80 bg-parchment/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.png" alt="Veritas Prep" className="h-10 w-10" />
          <span className="font-display text-lg tracking-tight text-ink-900">
            Veritas Prep
          </span>
        </Link>

        <nav className="hidden items-center gap-6 font-body text-sm text-ink-600 md:flex">
          <a href="/#services" className="ink-underline pb-1">Services</a>
          <a href="/#about" className="ink-underline pb-1">About</a>
          <a href="/#faq" className="ink-underline pb-1">FAQ</a>
          <Link to="/contact" className="ink-underline pb-1">Contact</Link>
          <Link to="/credits" className="ink-underline pb-1">Credits</Link>
          {!session && <Link to="/login" className="ink-underline pb-1">Login</Link>}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <>
              <button
                onClick={() => navigate("/apply")}
                className="rounded-sm bg-ink-900 px-5 py-2.5 font-body text-sm font-medium text-parchment transition hover:bg-ink-600"
              >
                Submit Your Application
              </button>

              {/* Name + credits + profile icon, desktop */}
              <details className="relative hidden md:block">
                <summary className="flex list-none cursor-pointer items-center gap-2.5 rounded-full border border-hairline bg-white py-1.5 pl-1.5 pr-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink-900 text-white">
                    <UserIcon />
                  </span>
                  <span className="font-body text-sm text-ink-900">
                    {firstName || "Account"}
                  </span>
                  <span className="rounded-full bg-gold-100 px-2 py-0.5 font-mono text-xs text-gold-700">
                    {profile ? `${profile.credits} VC` : "…"}
                  </span>
                </summary>
                <div className="absolute right-0 mt-2 w-44 rounded-sm border border-hairline bg-white p-2 font-body text-sm text-ink-600 shadow-lg">
                  <Link to="/student/dashboard" className="block rounded-sm px-3 py-2 hover:bg-parchment">
                    Dashboard
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="block w-full rounded-sm px-3 py-2 text-left hover:bg-parchment"
                  >
                    Sign out
                  </button>
                </div>
              </details>
            </>
          ) : (
            <button
              onClick={() => navigate("/login")}
              className="rounded-sm bg-ink-900 px-5 py-2.5 font-body text-sm font-medium text-parchment transition hover:bg-ink-600"
            >
              Login to Apply
            </button>
          )}

          {/* Mobile menu */}
          <details className="relative md:hidden">
            <summary className="list-none cursor-pointer rounded-sm border border-hairline p-2 text-ink-900">
              <span className="sr-only">Menu</span>
              ☰
            </summary>
            <div className="absolute right-0 mt-2 w-52 rounded-sm border border-hairline bg-white p-3 font-body text-sm text-ink-600 shadow-lg">
              <a href="/#services" className="block py-1.5">Services</a>
              <a href="/#about" className="block py-1.5">About</a>
              <a href="/#faq" className="block py-1.5">FAQ</a>
              <Link to="/contact" className="block py-1.5">Contact</Link>
              <Link to="/credits" className="block py-1.5">Credits</Link>
              {session ? (
                <>
                  <div className="mt-1 border-t border-hairline pt-2 text-xs text-slate-500">
                    {firstName || "Account"} · {profile ? `${profile.credits} VC` : "…"}
                  </div>
                  <Link to="/student/dashboard" className="block py-1.5">Dashboard</Link>
                  <button onClick={handleSignOut} className="block w-full py-1.5 text-left">
                    Sign out
                  </button>
                </>
              ) : (
                <Link to="/login" className="block py-1.5">Login</Link>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
