import { rand } from "./random";

export type PlingOp = "add" | "sub" | "mul" | "div";
export type PlingLevel = "easy" | "medium" | "hard";
export type PlingQuestion = {
  text: string;
  answer: string;
  pling: boolean;
  word: boolean;
  geo: boolean;
};
type Draft = { text: string; answer: string };

export const PLING_OPS: Record<PlingOp, string> = {
  add: "Addition",
  sub: "Subtraktion",
  mul: "Multiplikation",
  div: "Division",
};
export const PLING_LEVELS: Record<PlingLevel, string> = {
  easy: "Lätt",
  medium: "Medel",
  hard: "Svår",
};
export const PLING_TILE_OPTIONS = [20, 30, 40, 50, 60, 80, 100] as const;
export const PLING_TILES = 100;
/** Antal kolumner per antal rutor så att spelplanen blir jämn och rektangulär. */
export const PLING_COLUMNS: Record<number, number> = {
  20: 5,
  30: 6,
  40: 8,
  50: 10,
  60: 10,
  80: 10,
  100: 10,
};

const LEVEL_INDEX: Record<PlingLevel, 0 | 1 | 2> = { easy: 0, medium: 1, hard: 2 };
const pick = <T>(values: readonly T[]): T => values[rand(0, values.length - 1)]!;
const fmt = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");

const addSubRange: Record<PlingLevel, [number, number]> = {
  easy: [2, 20],
  medium: [10, 99],
  hard: [100, 999],
};

const normal: Record<PlingOp, (level: PlingLevel) => Draft> = {
  add(level) {
    const [lo, hi] = addSubRange[level];
    const a = rand(lo, hi);
    const b = rand(lo, hi);
    return { text: `${fmt(a)} + ${fmt(b)}`, answer: fmt(a + b) };
  },
  sub(level) {
    const [lo, hi] = addSubRange[level];
    const a = rand(lo + 1, hi);
    const b = rand(lo, a - 1);
    return { text: `${fmt(a)} − ${fmt(b)}`, answer: fmt(a - b) };
  },
  mul(level) {
    const [a, b] = {
      easy: [rand(2, 20), rand(2, 20)],
      medium: [rand(2, 20), rand(2, 20)],
      hard: [rand(11, 30), rand(2, 12)],
    }[level];
    return { text: `${a} × ${b}`, answer: fmt(a! * b!) };
  },
  div(level) {
    const [q, b] = {
      easy: [rand(2, 60), rand(2, 5)],
      medium: [rand(2, 50), rand(2, 12)],
      hard: [rand(11, 50), rand(2, 9)],
    }[level];
    return { text: `${fmt(q! * b!)} ÷ ${b}`, answer: String(q) };
  },
};

// Utmanande frågor: flera steg, procent, saknat tal, kvadrater och större faktorer.
const challenging: ((k: 0 | 1 | 2) => Draft)[] = [
  (k) => {
    const [lo, hi, cLo, cHi] = [
      [2, 9, 2, 5],
      [5, 20, 2, 9],
      [10, 50, 3, 9],
    ][k]!;
    const a = rand(lo!, hi!);
    const b = rand(lo!, hi!);
    const c = rand(cLo!, cHi!);
    return { text: `(${a} + ${b}) × ${c}`, answer: fmt((a + b) * c) };
  },
  (k) => {
    const [lo, hi] = [
      [2, 5],
      [2, 9],
      [3, 12],
    ][k]!;
    const [a, b, c, d] = [rand(lo!, hi!), rand(lo!, hi!), rand(lo!, hi!), rand(lo!, hi!)];
    return { text: `${a} × ${b} + ${c} × ${d}`, answer: fmt(a * b + c * d) };
  },
  (k) => {
    const pct = pick(
      [
        [5, 10, 20, 25, 40, 50, 60, 75, 80, 90],
        [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 80, 90],
        [5, 10, 20, 25, 30, 40, 60, 75, 90],
      ][k]!,
    );
    const y = 20 * rand(1, [10, 25, 50][k]!);
    return { text: `${pct} % av ${fmt(y)}`, answer: fmt((y * pct) / 100) };
  },
  (k) => {
    const form = rand(0, 2);
    if (form === 0) {
      const x = rand(10, [60, 400, 900][k]!);
      const a = rand(10, [60, 400, 900][k]!);
      return { text: `? + ${fmt(a)} = ${fmt(x + a)}`, answer: fmt(x) };
    }
    if (form === 1) {
      const x = rand(10, [60, 400, 900][k]!);
      const a = rand(10, [60, 400, 900][k]!);
      return { text: `${fmt(x + a)} − ? = ${fmt(x)}`, answer: fmt(a) };
    }
    const a = rand(2, [6, 9, 12][k]!);
    const x = rand(3, [12, 15, 25][k]!);
    return { text: `? × ${a} = ${fmt(a * x)}`, answer: fmt(x) };
  },
  (k) => {
    const [aLo, aHi, bLo, bHi] = [
      [11, 20, 3, 10],
      [11, 25, 3, 12],
      [12, 30, 12, 30],
    ][k]!;
    const a = rand(aLo!, aHi!);
    const b = rand(bLo!, bHi!);
    return { text: `${a} × ${b}`, answer: fmt(a * b) };
  },
  (k) => {
    const n = 2 * rand([10, 50, 100][k]!, [200, 500, 999][k]!);
    return { text: `Hälften av ${fmt(n)}`, answer: fmt(n / 2) };
  },
  (k) => {
    const a = rand([2, 5, 11][k]!, [20, 30, 40][k]!);
    return { text: `${a}²`, answer: fmt(a * a) };
  },
];

const NAMES = ["Alma", "Omar", "Elsa", "Hugo", "Maja", "Ali", "Nora", "Leo", "Siri", "Ravi"];
const THINGS = [
  ["äpplen", "ett äpple"],
  ["kort", "ett kort"],
  ["klistermärken", "ett klistermärke"],
  ["pennor", "en penna"],
  ["bullar", "en bulle"],
  ["kulor", "en kula"],
] as const;

const wordProblems: Record<PlingOp, (level: PlingLevel) => Draft> = {
  add(level) {
    const [lo, hi] = addSubRange[level];
    const a = rand(lo, hi);
    const b = rand(lo, hi);
    const [who1, who2] = [pick(NAMES), pick(NAMES)];
    const [things] = pick(THINGS);
    return {
      text: `${who1} har ${fmt(a)} ${things}. ${who2 === who1 ? "Hen" : who2} ger ${who1} ${fmt(b)} till. Hur många ${things} har ${who1} nu?`,
      answer: fmt(a + b),
    };
  },
  sub(level) {
    const [lo, hi] = addSubRange[level];
    const a = rand(lo + 1, hi);
    const b = rand(lo, a - 1);
    const [things] = pick(THINGS);
    const who = pick(NAMES);
    return {
      text: `${who} har ${fmt(a)} ${things} och ger bort ${fmt(b)}. Hur många ${things} har ${who} kvar?`,
      answer: fmt(a - b),
    };
  },
  mul(level) {
    const [a, b] = {
      easy: [rand(2, 5), rand(2, 10)],
      medium: [rand(2, 10), rand(2, 10)],
      hard: [rand(11, 25), rand(2, 9)],
    }[level];
    const [things] = pick(THINGS);
    return {
      text: `Det finns ${a} påsar med ${b} ${things} i varje. Hur många ${things} är det totalt?`,
      answer: fmt(a! * b!),
    };
  },
  div(level) {
    const [q, b] = {
      easy: [rand(2, 10), rand(2, 5)],
      medium: [rand(2, 10), rand(2, 10)],
      hard: [rand(11, 25), rand(2, 9)],
    }[level];
    const [things] = pick(THINGS);
    return {
      text: `${fmt(q! * b!)} ${things} delas lika mellan ${b} barn. Hur många ${things} får varje barn?`,
      answer: String(q),
    };
  },
};

const geometry: ((level: PlingLevel) => Draft)[] = [
  (level) => {
    const hi = { easy: 9, medium: 15, hard: 40 }[level];
    const [a, b] = [rand(2, hi), rand(2, hi)];
    return {
      text: `En rektangel är ${a} cm lång och ${b} cm bred. Vilken area har den (cm²)?`,
      answer: fmt(a * b),
    };
  },
  (level) => {
    const hi = { easy: 9, medium: 20, hard: 60 }[level];
    const [a, b] = [rand(2, hi), rand(2, hi)];
    return {
      text: `En rektangel är ${a} cm lång och ${b} cm bred. Hur lång är omkretsen (cm)?`,
      answer: fmt(2 * (a + b)),
    };
  },
  (level) => {
    const s = rand(2, { easy: 20, medium: 25, hard: 40 }[level]);
    return {
      text: `En kvadrat har sidan ${s} cm. Hur lång är omkretsen (cm)?`,
      answer: fmt(4 * s),
    };
  },
  (level) => {
    const s = rand(2, { easy: 20, medium: 25, hard: 40 }[level]);
    return { text: `En kvadrat har sidan ${s} cm. Vilken area har den (cm²)?`, answer: fmt(s * s) };
  },
  (level) => {
    const hi = { easy: 10, medium: 20, hard: 50 }[level];
    const base = 2 * rand(1, Math.floor(hi / 2));
    const h = rand(2, hi);
    return {
      text: `En triangel har basen ${base} cm och höjden ${h} cm. Vilken area har den (cm²)?`,
      answer: fmt((base * h) / 2),
    };
  },
  (_level) => {
    const a = rand(30, 80);
    const b = rand(30, 170 - a);
    return {
      text: `I en triangel är två vinklar ${a}° och ${b}°. Hur stor är den tredje vinkeln (°)?`,
      answer: fmt(180 - a - b),
    };
  },
  () =>
    pick([
      { text: "Hur många kanter har en kub?", answer: "12" },
      { text: "Hur många sidoytor har en kub?", answer: "6" },
      { text: "Hur många hörn har ett rätblock?", answer: "8" },
      { text: "Hur många grader är vinklarna i en triangel tillsammans?", answer: "180" },
      { text: "Hur många sidor har en hexagon?", answer: "6" },
      { text: "Hur många räta vinklar har en rektangel?", answer: "4" },
      { text: "Hur många hörn har en triangel?", answer: "3" },
      { text: "Hur många sidor har en femhörning?", answer: "5" },
      { text: "Hur många sidor har en oktagon?", answer: "8" },
      { text: "Hur många hörn har en sexhörning?", answer: "6" },
      { text: "Hur många kanter har ett rätblock?", answer: "12" },
      { text: "Hur många sidoytor har ett rätblock?", answer: "6" },
      { text: "Hur många hörn har en kvadrat?", answer: "4" },
      { text: "Hur många sidor har en rektangel?", answer: "4" },
      { text: "Hur många hörn har en romb?", answer: "4" },
      { text: "Hur många sidor har en parallellogram?", answer: "4" },
      { text: "Hur många räta vinklar har en kvadrat?", answer: "4" },
      { text: "Hur många hörn har en femhörning?", answer: "5" },
      { text: "Hur många hörn har en oktagon?", answer: "8" },
      { text: "Hur många sidor har en triangel?", answer: "3" },
    ]),
  (level) => {
    const hi = { easy: 10, medium: 15, hard: 25 }[level];
    const [a, b, c] = [rand(2, hi), rand(2, hi), rand(2, hi)];
    return {
      text: `Ett rätblock är ${a} cm långt, ${b} cm brett och ${c} cm högt. Hur stor är volymen (cm³)?`,
      answer: fmt(a * b * c),
    };
  },
];

/** Skapar unika frågor (som standard 100); plingCount av dem är utmanande Pling-plong-frågor,
 *  textShare och geometryShare (0–1) av de vanliga frågorna är text- respektive geometriuppgifter. */
export function generatePlingPlong(opts: {
  ops: PlingOp[];
  level: PlingLevel;
  plingCount: number;
  tiles?: number;
  textShare?: number;
  geometryShare?: number;
  randomOps?: boolean;
}): PlingQuestion[] {
  const ops = opts.ops.length > 0 ? opts.ops : (Object.keys(PLING_OPS) as PlingOp[]);
  const tiles = opts.tiles ?? PLING_TILES;
  const plingCount = Math.max(0, Math.min(tiles, Math.round(opts.plingCount)));
  const normalCount = tiles - plingCount;
  const share = (v?: number) => Math.round(normalCount * Math.max(0, Math.min(1, v ?? 0)));
  const geoCount = Math.min(normalCount, share(opts.geometryShare));
  const wordCount = Math.min(normalCount - geoCount, share(opts.textShare));
  const k = LEVEL_INDEX[opts.level];
  const seen = new Set<string>();
  const questions: PlingQuestion[] = [];
  const add = (make: () => Draft, pling: boolean, word = false, geo = false) => {
    for (let attempt = 0; attempt < 5000; attempt++) {
      const draft = make();
      if (!seen.has(draft.text)) {
        seen.add(draft.text);
        questions.push({ ...draft, pling, word, geo });
        return;
      }
    }
    throw new Error(
      `Unable to generate a unique ${pling ? "challenge" : "question"}; choose a different question mix.`,
    );
  };
  for (let i = 0; i < plingCount; i++) add(() => challenging[i % challenging.length]!(k), true);
  for (let i = 0; i < normalCount; i++) {
    const op = opts.randomOps ? ops[rand(0, ops.length - 1)]! : ops[i % ops.length]!;
    // Text- och geometriuppgifter fördelas jämnt över räknesätten respektive formerna.
    if (i < wordCount) add(() => wordProblems[op](opts.level), false, true);
    else if (i < wordCount + geoCount)
      add(() => geometry[i % geometry.length]!(opts.level), false, false, true);
    else add(() => normal[op](opts.level), false);
  }
  for (let i = questions.length - 1; i > 0; i--) {
    const j = rand(0, i);
    [questions[i], questions[j]] = [questions[j]!, questions[i]!];
  }
  return questions;
}
