// Veritas Credits (VC) — 1 VC = $10 USD
export const VC_TO_USD = 10;

export const PRICES = {
  activities: 3,
  essay_short: 3,    // ≤ 300 words
  essay_medium: 5,   // 301–500 words
  essay_long: 7,     // > 500 words (incl. Common App)
  meeting_15min: 1,
};

export const SERVICES = [
  { key: "activities",    label: "Activity List Review",              vc: 3, desc: "Framing, ordering, and descriptions that read like a narrative." },
  { key: "essay_short",  label: "Supplemental Essay (≤ 300 words)",  vc: 3, desc: "Line-by-line feedback on shorter supplements." },
  { key: "essay_medium", label: "Supplemental Essay (301–500 words)", vc: 5, desc: "Mid-length supplements, fully annotated." },
  { key: "essay_long",   label: "Essay (> 500 words / Common App)",  vc: 7, desc: "Includes your 650-word personal statement." },
  { key: "meeting",      label: "15-min 1:1 Meeting",                vc: 1, desc: "Live session to work through a specific question together." },
];

export function wordCount(text = "") {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function essayPrice(text = "") {
  const w = wordCount(text);
  if (w <= 300) return PRICES.essay_short;
  if (w <= 500) return PRICES.essay_medium;
  return PRICES.essay_long;
}
