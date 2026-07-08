import { useState } from "react";

const CATEGORY_STYLES = {
  Voice: { dot: "bg-gold-600", chip: "bg-gold-100 text-gold-700", mark: "bg-gold-100" },
  Clarity: { dot: "bg-sky-500", chip: "bg-sky-50 text-sky-700", mark: "bg-sky-50" },
  Structure: { dot: "bg-emerald-500", chip: "bg-emerald-50 text-emerald-700", mark: "bg-emerald-50" },
};

const PARAGRAPHS = [
  {
    id: 1,
    text: "The bread never rose the same way twice, and for a long time I thought that was a failure of the recipe.",
    category: "Voice",
    note: "This is the line they'll remember. Keep it, and build the rest of the essay around it.",
    rewrite: null,
  },
  {
    id: 2,
    text: "It took four summers at my grandmother's counter, dusted in flour, to realize the inconsistency was the lesson: humidity, altitude, the mood of the yeast — none of it was mine to control.",
    category: "Clarity",
    note: "Good — specific, sensory detail beats a generic claim every time.",
    rewrite: null,
  },
  {
    id: 3,
    text: "I stopped chasing a perfect loaf and started paying attention instead.",
    category: "Structure",
    note: "Tie this back to your opening line in one sentence to close the loop.",
    rewrite:
      "\u201cI stopped chasing a perfect loaf and started paying attention instead \u2014 which, it turns out, was the only recipe that ever really worked.\u201d",
  },
];

function ReviewCard({ paragraph, active, onSelect }) {
  const style = CATEGORY_STYLES[paragraph.category];
  return (
    <button
      type="button"
      onClick={() => onSelect(paragraph.id)}
      onMouseEnter={() => onSelect(paragraph.id)}
      className={`w-full rounded-sm border p-4 text-left transition ${
        active ? "border-ink-900 bg-white shadow-sm" : "border-hairline bg-white/60 hover:border-ink-400"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
        <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${style.chip}`}>
          {paragraph.category}
        </span>
      </div>
      <p className="mt-2 font-body text-sm leading-6 text-ink-700">{paragraph.note}</p>
      {paragraph.rewrite && (
        <p className="mt-2 border-t border-hairline pt-2 font-display text-sm italic leading-6 text-ink-500">
          Suggested: {paragraph.rewrite}
        </p>
      )}
    </button>
  );
}

export default function AnnotatedEssay() {
  const [activeId, setActiveId] = useState(PARAGRAPHS[0].id);
  const [notesOpen, setNotesOpen] = useState(false);

  return (
    <div className="grid gap-6 lg:grid-cols-[7fr_3fr]">
      {/* Document viewer */}
      <div className="rounded-sm bg-slate-100 p-4 sm:p-8">
        <div className="paper-shadow rounded-sm bg-white p-8 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-widest text-slate-500">
            Common App · Personal Essay · Draft 3
          </p>

          <div className="mt-6 space-y-5 font-display text-[1.05rem] leading-8 text-ink-900">
            {PARAGRAPHS.map((p) => (
              <p key={p.id} className="flex gap-4">
                <span className="mt-1 shrink-0 font-mono text-xs text-slate-400">{p.id}</span>
                <span
                  onMouseEnter={() => setActiveId(p.id)}
                  className={`rounded-sm px-1 -mx-1 transition-colors duration-300 ${
                    activeId === p.id ? CATEGORY_STYLES[p.category].mark : ""
                  }`}
                >
                  {p.text}
                </span>
              </p>
            ))}
          </div>

          <div className="mt-8 flex items-center justify-between border-t border-hairline pt-4">
            <span className="font-mono text-xs text-slate-500">642 / 650 words</span>
            <span className="rounded-full bg-gold-100 px-3 py-1 font-mono text-xs text-gold-600">
              Reviewed by Veritas Prep
            </span>
          </div>
        </div>
      </div>

      {/* Review notes — fixed panel on desktop, collapsible drawer on mobile */}
      <div className="lg:sticky lg:top-24 lg:self-start">
        <button
          type="button"
          onClick={() => setNotesOpen((v) => !v)}
          className="flex w-full items-center justify-between rounded-sm border border-hairline bg-white px-4 py-3 font-body text-sm font-medium text-ink-900 lg:hidden"
        >
          Review Notes
          <span className={`transition-transform ${notesOpen ? "rotate-180" : ""}`}>▾</span>
        </button>

        <div className={`${notesOpen ? "mt-3 block" : "hidden"} space-y-3 lg:mt-0 lg:block`}>
          <p className="hidden font-mono text-xs uppercase tracking-widest text-slate-500 lg:block">
            Review Notes
          </p>
          <div className="mt-2 space-y-3">
            {PARAGRAPHS.map((p) => (
              <ReviewCard
                key={p.id}
                paragraph={p}
                active={activeId === p.id}
                onSelect={setActiveId}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
