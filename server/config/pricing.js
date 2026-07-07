// Veritas Credits (VC) — 1 VC = $10 USD.
export const VC_TO_USD = 10;

export const LIMITS = {
  maxActivities: 10,
  essayMaxWords: 650, // Common App essay hard cap; also the ceiling for any essay
};

export const PRICES = {
  activities: 3, // Activity List feedback
  essay_short: 3, // Supplemental essay, <= 300 words
  essay_medium: 5, // Supplemental essay, 300-500 words
  essay_long: 7, // > 500 words, including the Common App essay
  meeting_15min: 1, // 15-minute 1:1 meeting
};

export function wordCount(text) {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function essayTier(words) {
  if (words <= 300) return "essay_short";
  if (words <= 500) return "essay_medium";
  return "essay_long";
}

// Computes the VC cost of a submission from what was actually filled in.
export function computeSubmissionCost({ essay, activities }) {
  const breakdown = [];
  let cost = 0;

  if (activities && activities.trim()) {
    cost += PRICES.activities;
    breakdown.push({ label: "Activities list feedback", vc: PRICES.activities });
  }

  if (essay && essay.trim()) {
    const words = wordCount(essay);
    const tier = essayTier(words);
    cost += PRICES[tier];
    const tierLabel =
      tier === "essay_short"
        ? "Essay (\u2264 300 words)"
        : tier === "essay_medium"
        ? "Essay (300\u2013500 words)"
        : "Essay (> 500 words)";
    breakdown.push({ label: `${tierLabel} \u2014 ${words} words`, vc: PRICES[tier] });
  }

  return { cost, breakdown };
}
