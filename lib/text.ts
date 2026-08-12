/**
 * Uppercases a UI label using English locale rules.
 * The document language is Turkish, where CSS text-transform and the default
 * toLocaleUpperCase turn 'i' into a dotted 'İ' (e.g. PAİR, HİSTORY) — forcing
 * 'en' keeps button labels clean (PAIR, HISTORY).
 */
export function upperEn(label: string): string {
  return label.toLocaleUpperCase('en');
}
