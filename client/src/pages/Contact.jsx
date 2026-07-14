import Nav from "../components/Nav.jsx";
import Footer from "../components/Footer.jsx";

export default function Contact() {
  return (
    <div>
      <Nav />
      <section className="mx-auto max-w-2xl px-6 py-16 sm:py-20">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Contact</p>
        <h1 className="mt-3 font-display text-4xl text-ink-900">Contact Us</h1>
        <p className="mt-4 font-body text-[1.05rem] leading-7 text-ink-600">
          Reach out with questions about services, submissions, credits, or scheduling.
        </p>

        <div className="mt-8 space-y-4 rounded-sm border border-hairline bg-white p-6">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Email</p>
            <a
              href="mailto:veritasprepinfo@gmail.com"
              className="mt-1 block font-body text-base text-ink-900 ink-underline"
            >
              veritasprepinfo@gmail.com
            </a>
          </div>

          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-gold-600">Phone</p>
            <a
              href="tel:+19498735192"
              className="mt-1 block font-body text-base text-ink-900 ink-underline"
            >
              9498735192
            </a>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
