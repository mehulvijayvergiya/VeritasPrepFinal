import { useRef, useState, useCallback } from "react";

const TYPE_STYLE = {
  highlight: "bg-gold-100 hover:bg-gold-300/60",
  underline: "underline decoration-2 decoration-gold-600 underline-offset-4 hover:bg-gold-100/50",
  note: "border-b-2 border-dotted border-ink-400 hover:bg-gold-100/50",
};

const TYPE_LABEL = { highlight: "Highlight", underline: "Underline", note: "Note" };

function makeId() {
  return `an_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Walks all text nodes inside `container` to translate a DOM Range boundary
// into a plain character offset within the essay string — this stays
// correct even after the text has been split into multiple <span>s.
function textOffset(container, node, offset) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  let count = 0;
  let current;
  while ((current = walker.nextNode())) {
    if (current === node) return count + offset;
    count += current.textContent.length;
  }
  return count;
}

function buildSegments(text, annotations) {
  const sorted = [...annotations].sort((a, b) => a.start - b.start);
  const segments = [];
  let cursor = 0;
  for (const ann of sorted) {
    const start = Math.max(ann.start, cursor);
    if (start >= ann.end) continue; // fully overlapped by a previous annotation, skip
    if (start > cursor) segments.push({ text: text.slice(cursor, start), ann: null });
    segments.push({ text: text.slice(start, ann.end), ann });
    cursor = ann.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), ann: null });
  return segments;
}

export default function EssayAnnotator({ essay, annotations, onChange }) {
  const containerRef = useRef(null);
  const [selection, setSelection] = useState(null); // { start, end, x, y }
  const [noteDraft, setNoteDraft] = useState("");
  const [composingNote, setComposingNote] = useState(false);
  const [openAnnotation, setOpenAnnotation] = useState(null); // { ann, x, y }
  const [editNote, setEditNote] = useState("");
  const [warning, setWarning] = useState("");

  const clearSelectionUi = () => {
    setSelection(null);
    setComposingNote(false);
    setNoteDraft("");
    window.getSelection()?.removeAllRanges();
  };

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current || !containerRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    const start = textOffset(containerRef.current, range.startContainer, range.startOffset);
    const end = textOffset(containerRef.current, range.endContainer, range.endOffset);
    const [lo, hi] = start < end ? [start, end] : [end, start];
    if (hi - lo < 1) return;

    const overlaps = annotations.some((a) => lo < a.end && hi > a.start);
    if (overlaps) {
      setWarning("That selection overlaps an existing mark. Remove it first to re-mark this text.");
      setTimeout(() => setWarning(""), 3000);
      clearSelectionUi();
      return;
    }

    const rect = range.getBoundingClientRect();
    setOpenAnnotation(null);
    setSelection({ start: lo, end: hi, x: rect.left + rect.width / 2, y: rect.top });
  }, [annotations]);

  function addAnnotation(type, note = "") {
    if (!selection) return;
    const next = [
      ...annotations,
      { id: makeId(), start: selection.start, end: selection.end, type, note },
    ];
    onChange(next);
    clearSelectionUi();
  }

  function saveNoteToOpenAnnotation() {
    if (!openAnnotation) return;
    const next = annotations.map((a) =>
      a.id === openAnnotation.ann.id ? { ...a, note: editNote } : a
    );
    onChange(next);
    setOpenAnnotation(null);
  }

  function deleteOpenAnnotation() {
    if (!openAnnotation) return;
    onChange(annotations.filter((a) => a.id !== openAnnotation.ann.id));
    setOpenAnnotation(null);
  }

  const segments = buildSegments(essay, annotations);

  return (
    <div className="relative">
      <div className="mb-2 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-gold-600">
          Essay — select text to markup
        </p>
        {warning && <p className="font-body text-xs text-red-700">{warning}</p>}
      </div>

      <div
        ref={containerRef}
        onMouseUp={handleMouseUp}
        className="select-text rounded-sm border border-hairline bg-white p-6 font-display text-[0.98rem] leading-8 text-ink-900 whitespace-pre-wrap"
      >
        {segments.map((seg, i) =>
          seg.ann ? (
            <span
              key={seg.ann.id}
              onClick={(e) => {
                e.stopPropagation();
                setSelection(null);
                setEditNote(seg.ann.note || "");
                const rect = e.currentTarget.getBoundingClientRect();
                setOpenAnnotation({ ann: seg.ann, x: rect.left, y: rect.bottom + 6 });
              }}
              className={`cursor-pointer rounded-sm px-0.5 transition ${TYPE_STYLE[seg.ann.type]}`}
              title={seg.ann.note ? seg.ann.note : TYPE_LABEL[seg.ann.type]}
            >
              {seg.text}
            </span>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </div>

      {/* Floating toolbar on new selection */}
      {selection && (
        <div
          className="fixed z-50 -translate-x-1/2 -translate-y-full rounded-sm border border-hairline bg-ink-900 px-2 py-2 paper-shadow"
          style={{ left: selection.x, top: selection.y - 10 }}
        >
          {!composingNote ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => addAnnotation("highlight")}
                className="rounded-sm px-3 py-1.5 font-body text-xs font-medium text-white hover:bg-white/10"
              >
                Highlight
              </button>
              <button
                onClick={() => addAnnotation("underline")}
                className="rounded-sm px-3 py-1.5 font-body text-xs font-medium text-white hover:bg-white/10"
              >
                Underline
              </button>
              <button
                onClick={() => setComposingNote(true)}
                className="rounded-sm bg-gold-600 px-3 py-1.5 font-body text-xs font-medium text-white hover:bg-gold-600/90"
              >
                + Note
              </button>
              <button
                onClick={clearSelectionUi}
                className="rounded-sm px-2 py-1.5 font-body text-xs text-white/60 hover:text-white"
                aria-label="Cancel"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="w-64">
              <textarea
                autoFocus
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
                placeholder="Write your note on this line..."
                className="w-full resize-none rounded-sm border-0 bg-white px-3 py-2 font-body text-sm text-ink-900 focus:outline-none"
                rows={3}
              />
              <div className="mt-1.5 flex justify-end gap-2">
                <button
                  onClick={clearSelectionUi}
                  className="rounded-sm px-3 py-1 font-body text-xs text-white/70 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => addAnnotation("note", noteDraft.trim())}
                  disabled={!noteDraft.trim()}
                  className="rounded-sm bg-gold-600 px-3 py-1 font-body text-xs font-medium text-white disabled:opacity-50"
                >
                  Save note
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Popover on existing annotation */}
      {openAnnotation && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpenAnnotation(null)} />
          <div
            className="fixed z-50 w-72 rounded-sm border border-hairline bg-white p-4 paper-shadow"
            style={{ left: openAnnotation.x, top: openAnnotation.y }}
          >
            <p className="font-mono text-[11px] uppercase tracking-widest text-gold-600">
              {TYPE_LABEL[openAnnotation.ann.type]}
            </p>
            <textarea
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Add a note for this mark..."
              className="mt-2 w-full resize-none rounded-sm border border-hairline px-3 py-2 font-body text-sm focus:border-ink-900 focus:outline-none"
              rows={3}
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={deleteOpenAnnotation}
                className="font-body text-xs text-red-700 hover:underline"
              >
                Remove mark
              </button>
              <button
                onClick={saveNoteToOpenAnnotation}
                className="rounded-sm bg-ink-900 px-3 py-1.5 font-body text-xs font-medium text-white hover:bg-ink-600"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
