export type DeinflectionRule = {
  ruleName: string;
  suffix: string;
  replacement: string;
  type?: string;
};

// Standard 五十音 (gojuon) sound-row table: the five vowel forms (a/i/u/e/o)
// for each consonant, used below to derive Godan (u-verb) conjugation stems.
const GOJUON_ROWS = {
  w: ["わ", "い", "う", "え", "お"],
  k: ["か", "き", "く", "け", "こ"],
  g: ["が", "ぎ", "ぐ", "げ", "ご"],
  s: ["さ", "し", "す", "せ", "そ"],
  t: ["た", "ち", "つ", "て", "と"],
  n: ["な", "に", "ぬ", "ね", "の"],
  b: ["ば", "び", "ぶ", "べ", "ぼ"],
  m: ["ま", "み", "む", "め", "も"],
  r: ["ら", "り", "る", "れ", "ろ"],
} as const;

type GodanRow = keyof typeof GOJUON_ROWS;

const GODAN_ENDINGS: Array<{ ending: string; row: GodanRow; onbin: "small-tsu" | "n" | "i" | "shi" }> = [
  { ending: "う", row: "w", onbin: "small-tsu" },
  { ending: "つ", row: "t", onbin: "small-tsu" },
  { ending: "る", row: "r", onbin: "small-tsu" },
  { ending: "ぬ", row: "n", onbin: "n" },
  { ending: "ぶ", row: "b", onbin: "n" },
  { ending: "む", row: "m", onbin: "n" },
  { ending: "く", row: "k", onbin: "i" },
  { ending: "ぐ", row: "g", onbin: "i" },
  { ending: "す", row: "s", onbin: "shi" },
];

const ONBIN_TE_TA: Record<"small-tsu" | "n" | "i" | "shi", [string, string]> = {
  "small-tsu": ["って", "った"],
  n: ["んで", "んだ"],
  i: ["いて", "いた"],
  shi: ["して", "した"],
};
const GU_TE_TA: [string, string] = ["いで", "いだ"];

function buildGodanRules(): DeinflectionRule[] {
  const rules: DeinflectionRule[] = [];

  for (const { ending, row, onbin } of GODAN_ENDINGS) {
    const [aRow, iRow, , eRow, oRow] = GOJUON_ROWS[row];
    const [teSuffix, taSuffix] = ending === "ぐ" ? GU_TE_TA : ONBIN_TE_TA[onbin];
    const taraSuffix = taSuffix + "ら";
    const tariSuffix = taSuffix + "り";

    rules.push({ ruleName: "Volitional (Godan)", suffix: oRow + "う", replacement: ending, type: "volitional" });
    rules.push({ ruleName: "Negative (Godan)", suffix: aRow + "ない", replacement: ending, type: "negative" });
    rules.push({ ruleName: "Potential (Godan)", suffix: eRow + "る", replacement: ending, type: "potential" });
    rules.push({ ruleName: "Passive (Godan)", suffix: aRow + "れる", replacement: ending, type: "passive" });
    rules.push({ ruleName: "Causative (Godan)", suffix: aRow + "せる", replacement: ending, type: "causative" });
    rules.push({ ruleName: "Causative-Passive (Godan)", suffix: aRow + "される", replacement: ending, type: "causative-passive" });
    rules.push({ ruleName: "Polite (Godan)", suffix: iRow + "ます", replacement: ending, type: "polite" });
    rules.push({ ruleName: "Polite Past (Godan)", suffix: iRow + "ました", replacement: ending, type: "polite-past" });
    rules.push({ ruleName: "Polite Neg (Godan)", suffix: iRow + "ません", replacement: ending, type: "polite-negative" });
    rules.push({ ruleName: "Te (Godan)", suffix: teSuffix, replacement: ending, type: "te" });
    rules.push({ ruleName: "Past (Godan)", suffix: taSuffix, replacement: ending, type: "past" });
    rules.push({ ruleName: "Tara (Godan)", suffix: taraSuffix, replacement: ending, type: "tara" });
    rules.push({ ruleName: "Tari (Godan)", suffix: tariSuffix, replacement: ending, type: "tari" });
    rules.push({ ruleName: "Ba (Godan)", suffix: eRow + "ば", replacement: ending, type: "ba" });
  }

  return rules;
}

const ICHIDAN_RULES: DeinflectionRule[] = [
  { ruleName: "Volitional (Ichidan)", suffix: "よう", replacement: "る", type: "volitional" },
  { ruleName: "Negative (Ichidan)", suffix: "ない", replacement: "る", type: "negative" },
  { ruleName: "Potential/Passive (Ichidan)", suffix: "られる", replacement: "る", type: "passive" },
  { ruleName: "Causative (Ichidan)", suffix: "させる", replacement: "る", type: "causative" },
  { ruleName: "Polite (Ichidan)", suffix: "ます", replacement: "る", type: "polite" },
  { ruleName: "Polite Past (Ichidan)", suffix: "ました", replacement: "る", type: "polite-past" },
  { ruleName: "Polite Neg (Ichidan)", suffix: "ません", replacement: "る", type: "polite-negative" },
  { ruleName: "Te (Ichidan)", suffix: "て", replacement: "る", type: "te" },
  { ruleName: "Past (Ichidan)", suffix: "た", replacement: "る", type: "past" },
  { ruleName: "Tara (Ichidan)", suffix: "たら", replacement: "る", type: "tara" },
  { ruleName: "Tari (Ichidan)", suffix: "たり", replacement: "る", type: "tari" },
  { ruleName: "Ba (Ichidan)", suffix: "れば", replacement: "る", type: "ba" },
];

const ADJECTIVE_RULES: DeinflectionRule[] = [
  { ruleName: "Adjective Past", suffix: "かった", replacement: "い", type: "past" },
  { ruleName: "Adjective Negative", suffix: "くない", replacement: "い", type: "negative" },
  { ruleName: "Adjective Negative Past", suffix: "くなかった", replacement: "い", type: "negative-past" },
  { ruleName: "Adjective Adverbial", suffix: "く", replacement: "い", type: "adverbial" },
  { ruleName: "Adjective Te", suffix: "くて", replacement: "い", type: "te" },
  { ruleName: "Adjective Ba", suffix: "ければ", replacement: "い", type: "ba" },
];

const COLLOQUIAL_CONTRACTIONS: DeinflectionRule[] = [
  { ruleName: "Contraction (chau)", suffix: "ちゃう", replacement: "る", type: "colloquial" },
  { ruleName: "Contraction (chatta)", suffix: "ちゃった", replacement: "る", type: "colloquial" },
  { ruleName: "Contraction (teru)", suffix: "てる", replacement: "る", type: "colloquial" },
  { ruleName: "Contraction (teta)", suffix: "てた", replacement: "る", type: "colloquial" },
  { ruleName: "Contraction (deru)", suffix: "でる", replacement: "ぶ", type: "colloquial" },
  { ruleName: "Contraction (toku)", suffix: "とく", replacement: "る", type: "colloquial" },
  { ruleName: "Contraction (toita)", suffix: "といた", replacement: "る", type: "colloquial" },
  { ruleName: "Contraction (nakya)", suffix: "なきゃ", replacement: "ない", type: "colloquial" },
  { ruleName: "Contraction (nakucha)", suffix: "なくちゃ", replacement: "ない", type: "colloquial" },
];

export const DEINFLECTION_RULES: DeinflectionRule[] = [
  ...buildGodanRules(),
  ...ICHIDAN_RULES,
  ...ADJECTIVE_RULES,
  ...COLLOQUIAL_CONTRACTIONS,
];

export type DeinflectionResult = {
  word: string;
  rules: string[];
};

/**
 * Returns a list of possible dictionary base forms for a given conjugated word
 * using breadth-first search de-inflection up to depth 2.
 * Always includes the original word as the first attempt.
 */
export function getBaseForms(word: string): DeinflectionResult[] {
  const results: DeinflectionResult[] = [{ word, rules: [] }];
  const queue: Array<{ word: string; depth: number; rules: string[] }> = [
    { word, depth: 0, rules: [] },
  ];
  const seen = new Set<string>([word]);

  while (queue.length > 0) {
    const curr = queue.shift()!;
    if (curr.depth >= 2) continue;

    for (const rule of DEINFLECTION_RULES) {
      if (curr.word.endsWith(rule.suffix) && curr.word.length > rule.suffix.length) {
        const baseForm = curr.word.slice(0, -rule.suffix.length) + rule.replacement;
        if (!seen.has(baseForm)) {
          seen.add(baseForm);
          const newRules = [...curr.rules, rule.ruleName];
          results.push({ word: baseForm, rules: newRules });
          queue.push({ word: baseForm, depth: curr.depth + 1, rules: newRules });
        }
      }
    }
  }

  // Common irregulars
  const irSuru = [
    "した", "して", "します", "しました", "しない", "しよう",
    "される", "させる", "させられる", "すれば", "したら", "しちゃう", "しちゃった"
  ];
  if (irSuru.includes(word) && !seen.has("する")) {
    results.push({ word: "する", rules: ["Irregular (suru)"] });
  }

  const irKuru = [
    "きた", "きて", "きます", "きました", "こない", "こよう",
    "こられる", "こさせる", "くれば", "きたら", "きちゃう", "きちゃった"
  ];
  if (irKuru.includes(word) && !seen.has("来る")) {
    results.push({ word: "来る", rules: ["Irregular (kuru)"] });
  }

  if (
    (word.startsWith("行っ") || word === "行かない" || word === "行こう" || word === "行ける" || word === "行けば") &&
    !seen.has("行く")
  ) {
    results.push({ word: "行く", rules: ["Irregular (iku)"] });
  }

  if (["よかった", "よくない", "よくなかった", "よく", "よければ"].includes(word)) {
    if (!seen.has("いい")) results.push({ word: "いい", rules: ["Irregular (ii)"] });
    if (!seen.has("良い")) results.push({ word: "良い", rules: ["Irregular (ii)"] });
  }

  return results;
}
