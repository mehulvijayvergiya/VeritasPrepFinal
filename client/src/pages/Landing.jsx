import { Link } from "react-router-dom";
import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";
import AnnotatedEssay from "../components/AnnotatedEssay.jsx";

const SERVICES = [
  {
    n: "Essay Review",
    d: "Line-by-line feedback on your personal statement and supplements — what's working, what's generic, and where your real voice is hiding.",
  },
  {
    n: "Activities List Feedback",
    d: "Turn a flat list of clubs into a narrative admissions officers can actually follow. Framing, ordering, and word choice that earns attention.",
  },
  {
    n: "Full Application Review",
    d: "A complete read of every component together, checking that your essays, activities, and academics tell one coherent story.",
  },
  {
    n: "1:1 Mentorship",
    d: "Ongoing sessions with your reviewer as you draft, revise, and prepare — not a one-time comment thread.",
  },
];

const FAQS = [
  {
    q: "Who reviews my application?",
    a: "Every submission is read personally by our founder, a Cornell '30 Computer Science student who has spent years studying what actually moves an admissions committee — not a generic template or an algorithm.",
  },
  {
    q: "How long does feedback take?",
    a: "Most students hear back within 3–5 days of submitting. Mentorship clients get a set cadence agreed on during your first session.",
  },
  {
    q: "Do you write essays for me?",
    a: "No. Veritas Prep exists to sharpen your own story, not replace it. Feedback is about clarity, structure, and honesty — the writing stays yours.",
  },
  {
    q: "What if I only need help with one part of my application?",
    a: "That's most of our submissions. Pick just Essay Review or Activities List Feedback if that's all you need — the submission form lets you specify.",
  },
];

export default function Landing() {
  return (
    <div>
      <Nav />

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-6 pb-20 pt-16 sm:pt-24">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-600">
              Admissions guidance, read closely
            </p>
            <h1 className="mt-4 font-display text-[2.75rem] leading-[1.08] text-ink-900 sm:text-6xl">
              Authentic stories.
              <br />
              Stronger applications.
            </h1>
            <p className="mt-6 max-w-md font-body text-lg leading-relaxed text-ink-600">
              Better admissions outcomes start with the parts of your story you've
              stopped noticing. We help you find them — then help you write them
              well.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                to="/apply"
                className="rounded-sm bg-ink-900 px-7 py-3.5 text-center font-body text-sm font-medium text-parchment transition hover:bg-ink-600"
              >
                Submit Your Application
              </Link>
              <a
                href="#services"
                className="ink-underline px-1 py-3.5 text-center font-body text-sm font-medium text-ink-900"
              >
                See what we review →
              </a>
            </div>
          </div>

          <AnnotatedEssay />
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="border-y border-hairline bg-white">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-600">About</p>
            <h2 className="mt-3 font-display text-3xl text-ink-900 sm:text-4xl">
              Founded by a reader, not a consultant.
            </h2>
          </div>
          <div className="max-w-prose space-y-5 font-body text-[1.05rem] leading-8 text-ink-600">
            <p>
              Veritas Prep was started by a Cornell '30 Computer Science student who
              spent his own admissions cycle rewriting the same essay eight times —
              and learned, eventually, that the version admissions officers
              responded to wasn't the most polished one. It was the truest one.
            </p>
            <p>
              That's the whole premise here: admissions isn't a checklist of
              achievements, it's storytelling. Grades and test scores open the
              file. What gets remembered is the way you write about the thing you
              actually care about.
            </p>
            <p>
              Every submission is read personally — no outsourced readers, no
              recycled comments. Just a close read from someone who studies this
              closely.
            </p>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="mx-auto max-w-6xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Services</p>
        <h2 className="mt-3 font-display text-3xl text-ink-900 sm:text-4xl">
          Choose what your application needs.
        </h2>

        <div className="mt-12 grid gap-px overflow-hidden rounded-sm border border-hairline bg-hairline sm:grid-cols-2">
          {SERVICES.map((s) => (
            <div key={s.n} className="bg-white p-8">
              <h3 className="font-display text-xl text-ink-900">{s.n}</h3>
              <p className="mt-3 font-body text-[0.95rem] leading-7 text-ink-600">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* QUOTE */}
      <section className="border-y border-hairline bg-ink-900">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="font-display text-2xl italic leading-relaxed text-white sm:text-3xl">
            "The best essay I read all year wasn't about a triumph. It was about a
            sourdough starter that kept failing — and what the writer learned from
            letting it fail."
          </p>
          <p className="mt-6 font-mono text-xs uppercase tracking-widest text-gold-300">
            — Founder, Veritas Prep
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-600">FAQ</p>
        <h2 className="mt-3 font-display text-3xl text-ink-900">Good to know.</h2>

        <div className="mt-10 divide-y divide-hairline border-y border-hairline">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between font-body text-[1.05rem] font-medium text-ink-900">
                {f.q}
                <span className="ml-4 shrink-0 font-display text-xl text-gold-600 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-3 max-w-prose font-body text-[0.95rem] leading-7 text-ink-600">
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA BAND */}
      <section className="bg-gold-100">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 px-6 py-16 sm:flex-row sm:items-center">
          <h2 className="font-display text-2xl text-ink-900 sm:text-3xl sm:max-w-md">
            Ready to see your application through a reader's eyes?
          </h2>
          <Link
            to="/apply"
            className="shrink-0 rounded-sm bg-ink-900 px-7 py-3.5 font-body text-sm font-medium text-parchment transition hover:bg-ink-600"
          >
            Submit Your Application
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
