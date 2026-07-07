export default function AnnotatedEssay() {
  return (
    <div className="paper-shadow rounded-sm border border-hairline bg-white p-8 sm:p-10">
      <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
        Common App · Personal Essay · Draft 3
      </p>

      <div className="mt-6 space-y-5 font-display text-[1.05rem] leading-8 text-ink-900">
        <p
          className="marginalia"
          data-note="This is the line they'll remember. Keep it — build the rest around it."
        >
          The bread never rose the same way twice, and for a long time I thought that
          was a failure of the recipe.
        </p>
        <p
          className="marginalia"
          data-note="Good — specific detail over generic claim."
        >
          It took four summers at my grandmother's counter, dusted in flour, to
          realize the inconsistency was the lesson: humidity, altitude, the mood
          of the yeast — none of it was mine to control.
        </p>
        <p
          className="marginalia hidden lg:block"
          data-note="Tie this back to your intro in one sentence."
        >
          I stopped chasing a perfect loaf and started paying attention instead.
        </p>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-hairline pt-4">
        <span className="font-mono text-xs text-slate-500">642 / 650 words</span>
        <span className="rounded-full bg-gold-100 px-3 py-1 font-mono text-xs text-gold-600">
          Reviewed by Veritas Prep
        </span>
      </div>
    </div>
  );
}
