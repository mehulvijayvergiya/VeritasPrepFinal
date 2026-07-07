import { Link, useLocation } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";

export default function Confirmation() {
  const { state } = useLocation();
  const name = state?.name?.split(" ")[0];

  return (
    <div>
      <Nav />
      <section className="mx-auto flex max-w-2xl flex-col items-start px-6 py-24 sm:py-32">
        <span className="rounded-full bg-gold-100 px-3 py-1 font-mono text-xs text-gold-600">
          Received
        </span>
        <h1 className="mt-5 font-display text-4xl text-ink-900 sm:text-5xl">
          {name ? `Thank you, ${name}.` : "Thank you."}
        </h1>
        <p className="mt-5 max-w-md font-body text-[1.05rem] leading-7 text-ink-600">
          Your submission has been received. We read every application closely —
          expect an email from us within 3–5 days with feedback and next steps.
        </p>
        <Link
          to="/"
          className="ink-underline mt-8 font-body text-sm font-medium text-ink-900"
        >
          ← Back to home
        </Link>
      </section>
      <Footer />
    </div>
  );
}
