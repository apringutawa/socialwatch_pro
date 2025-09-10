
export const labelScore = (text) => {
  const t = text.toLowerCase();
  if (/(bagus|mantap|promo|diskon|terbaik|hebat)/.test(t)) return { label: "positive", score: 0.75 };
  if (/(keluhan|lambat|buruk|parah|jelek|benci)/.test(t)) return { label: "negative", score: 0.70 };
  return { label: "neutral", score: 0.50 };
};
export const extractKeywords = (text) =>
  Array.from(new Set((text.toLowerCase().match(/[a-z0-9_]+/g) || [])
    .filter(w => w.length >= 4 && !["yang","untuk","dari","dengan","pada","http","https"].includes(w))));
