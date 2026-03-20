/** Client sales question library (Q1–Q15) — used for coverage mapping */
export const QUESTIONNAIRE_TOPICS = [
  "Q1: Entire kitchen remodel vs cabinets only",
  "Q2: Primary home vs rental",
  "Q3: Kitchen size / layout",
  "Q4: Same layout vs redesign",
  "Q5: Cabinet style preference (Shaker, flat, traditional)",
  "Q6: Cabinet color / finish",
  "Q7: Budget range for cabinets",
  "Q8: Design consultation / review designs",
  "Q9: Thoughts on design proposal shared",
  "Q10: Comparing quotes from other companies",
  "Q11: Materials other companies offer",
  "Q12: Help reviewing competitor quote",
  "Q13: Concerns on pricing or materials",
  "Q14: Add-ons (soft-close, organizers)",
  "Q15: Delivery / installation concerns",
] as const;

export const KEYWORD_TAXONOMY = [
  "Budget",
  "Cabinet Style",
  "Installation",
  "Delivery Timeline",
  "Warranty",
  "Design Consultation",
  "Competitor",
  "Materials",
] as const;
