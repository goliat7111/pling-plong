import { useCallback, useEffect, useMemo, useState, type ButtonHTMLAttributes } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import {
  generatePlingPlong,
  PLING_COLUMNS,
  PLING_LEVELS,
  PLING_OPS,
  PLING_TILE_OPTIONS,
  type PlingLevel,
  type PlingOp,
  type PlingQuestion,
} from "./lib/pling-plong";
import {
  generateSubjectPlingPlong,
  parseCustomPlingQuestions,
  PLING_SUBJECTS,
  type PlingSubject,
} from "./lib/pling-plong-subjects";

const OPS = Object.keys(PLING_OPS) as PlingOp[];
const LEVELS = Object.keys(PLING_LEVELS) as PlingLevel[];
const points = (pling: boolean) => ({ self: pling ? 5 : 3, help: pling ? 3 : 1 });
const MAX_GROUPS = 8;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
const STORAGE_KEY = "pling-plong-groups";
const DEFAULT_GROUP_NAMES = ["Lag 1", "Lag 2", "Lag 3", "Lag 4"];
const SUBJECT_GROUPS: { label: string; subjects: PlingSubject[] }[] = [
  {
    label: "SO",
    subjects: ["geografi", "historia", "religion", "samhallskunskap"],
  },
  { label: "NO", subjects: ["biologi", "fysik", "kemi", "teknik"] },
  { label: "Övriga ämnen", subjects: ["hem-och-konsumentkunskap", "engelska", "svenska"] },
];

export default function App() {
  const [mode, setMode] = useState<"math" | "subjects">("math");
  return <PlingPlongGame key={mode} mode={mode} onModeChange={setMode} />;
}

function PlingPlongGame({
  mode,
  onModeChange,
}: {
  mode: "math" | "subjects";
  onModeChange: (mode: "math" | "subjects") => void;
}) {
  const [ops, setOps] = useState<PlingOp[]>(OPS);
  const [randomOps, setRandomOps] = useState(true);
  const [level, setLevel] = useState<PlingLevel>("medium");
  const [plingCount, setPlingCount] = useState(25);
  const [textPercent, setTextPercent] = useState(0);
  const [geoPercent, setGeoPercent] = useState(0);
  const [tileCount, setTileCount] = useState(100);
  const [subject, setSubject] = useState<PlingSubject>("geografi");
  const [questionSource, setQuestionSource] = useState<"subject" | "custom">("subject");
  const [customQuestionsText, setCustomQuestionsText] = useState("");
  const [questions, setQuestions] = useState<PlingQuestion[]>([]);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [resolved, setResolved] = useState<boolean[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [scores, setScores] = useState<number[]>([]);
  const [names, setNames] = useState<string[]>([
    ...DEFAULT_GROUP_NAMES,
    ...Array(MAX_GROUPS - DEFAULT_GROUP_NAMES.length).fill(""),
  ]);
  const [loaded, setLoaded] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [boardZoom, setBoardZoom] = useState(1);
  const zoomBoard = (dir: number) =>
    setBoardZoom((z) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((z + dir * ZOOM_STEP) * 100) / 100)),
    );
  const [turn, setTurn] = useState(0);
  const customQuestions = useMemo(
    () => parseCustomPlingQuestions(customQuestionsText),
    [customQuestionsText],
  );
  const customQuestionsValid = customQuestions.questions.length >= tileCount;

  const start = useCallback(
    (groupsOverride?: number) => {
      const nextQuestions =
        mode === "subjects"
          ? questionSource === "custom"
            ? customQuestionsValid
              ? generateSubjectPlingPlong({
                  subject,
                  customQuestions: customQuestions.questions,
                  plingCount,
                  tiles: tileCount,
                })
              : []
            : generateSubjectPlingPlong({ subject, plingCount, tiles: tileCount })
          : generatePlingPlong({
              ops,
              level,
              plingCount,
              tiles: tileCount,
              textShare: textPercent / 100,
              geometryShare: geoPercent / 100,
              randomOps,
            });
      setQuestions(nextQuestions);
      setFlipped(Array(tileCount).fill(false));
      setResolved(Array(tileCount).fill(false));
      setActive(null);
      setShowAnswer(false);
      setScores(Array(groupsOverride ?? scores.length).fill(0));
      setTurn(0);
    },
    [
      mode,
      questionSource,
      customQuestionsValid,
      customQuestions.questions,
      subject,
      plingCount,
      tileCount,
      ops,
      level,
      textPercent,
      geoPercent,
      randomOps,
      scores.length,
    ],
  );
  function resetToDefaults() {
    if (!window.confirm("Återställa hela spelet till grundinställningarna?")) return;

    setOps(OPS);
    setRandomOps(true);
    setLevel("medium");
    setPlingCount(25);
    setTextPercent(0);
    setGeoPercent(0);
    setTileCount(100);
    setSubject("geografi");
    setQuestionSource("subject");
    setCustomQuestionsText("");
    setNames([...DEFAULT_GROUP_NAMES, ...Array(MAX_GROUPS - DEFAULT_GROUP_NAMES.length).fill("")]);
    setQuestions(
      mode === "subjects"
        ? generateSubjectPlingPlong({ subject: "geografi", plingCount: 25, tiles: 100 })
        : generatePlingPlong({
            ops: OPS,
            level: "medium",
            plingCount: 25,
            tiles: 100,
            textShare: 0,
            geometryShare: 0,
            randomOps: true,
          }),
    );
    setFlipped(Array(100).fill(false));
    setResolved(Array(100).fill(false));
    setActive(null);
    setShowAnswer(false);
    setScores(Array(4).fill(0));
    setTurn(0);
    setPlaying(false);
  }
  // Frågor och sparade grupper hämtas först efter första renderingen så att servern och klienten stämmer överens.
  useEffect(() => {
    let count = 4;
    try {
      const saved: { names?: unknown; count?: unknown } | null = JSON.parse(
        localStorage.getItem(STORAGE_KEY) ?? "null",
      );
      const savedNames: unknown = saved?.names;
      if (Array.isArray(savedNames)) {
        setNames(
          Array.from({ length: MAX_GROUPS }, (_, i) =>
            typeof savedNames[i] === "string" ? (savedNames[i] as string) : "",
          ),
        );
      }
      if (typeof saved?.count === "number") count = Math.max(1, Math.min(MAX_GROUPS, saved.count));
    } catch {
      // Sparade grupper är valfria.
    }
    start(count);
    setLoaded(true);
  }, [start]);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ names, count: scores.length }));
    } catch {
      // Sparade grupper är valfria.
    }
  }, [loaded, names, scores.length]);
  // Förhandsvisa spelplanen direkt när inställningarna ändras.
  useEffect(() => {
    if (loaded && !playing) start();
  }, [loaded, playing, start]);

  const groups = scores.length;
  const nameOf = (g: number) => names[g]?.trim() || `Grupp ${g + 1}`;
  const addGroup = () => setScores((s) => (s.length < MAX_GROUPS ? [...s, 0] : s));
  const removeGroup = () => {
    if (groups <= 1) return;
    setScores((s) => s.slice(0, -1));
    setTurn((t) => (t >= groups - 1 ? 0 : t));
  };
  const q = active === null ? null : questions[active]!;
  const finished = flipped.length > 0 && flipped.every(Boolean) && resolved.every(Boolean);
  const best = Math.max(...scores, 0);
  const winners = scores.flatMap((s, g) => (s === best ? [nameOf(g)] : []));
  const awaitingAnswer = playing && active !== null && !resolved[active];

  function pickTile(i: number) {
    if (awaitingAnswer && active !== i) return;
    if (!flipped[i]) setFlipped((f) => f.map((v, k) => v || k === i));
    setActive(i);
    setShowAnswer(false);
  }
  function award(kind: "self" | "help") {
    if (active === null || !q) return;
    const gained = points(q.pling)[kind];
    setScores((s) => s.map((v, k) => (k === turn ? v + gained : v)));
    finish();
  }
  function finish() {
    if (active === null) return;
    setResolved((r) => r.map((v, k) => v || k === active));
    setShowAnswer(true);
    setTurn((t) => (t + 1) % groups);
  }
  const adjust = (g: number, d: number) =>
    setScores((s) => s.map((v, k) => (k === g ? Math.max(0, v + d) : v)));
  const toggleOp = (op: PlingOp) =>
    setOps((o) => (o.includes(op) ? o.filter((x) => x !== op) : [...o, op]));

  const field = "rounded-md border border-input bg-background px-2 py-1.5 text-sm";

  return (
    <div className="min-h-screen bg-background pb-24">
      {!playing && (
        <header className="border-b bg-card px-6 py-4">
          <div className="mx-auto flex max-w-[110rem] flex-wrap items-center justify-between gap-3">
            <h1 className="font-display text-2xl font-semibold">
              {mode === "subjects" ? "PLING-PLONG ämnen" : "PLING-PLONG matematik"}
            </h1>
            <div className="flex gap-2" aria-label="Spelläge">
              <Button
                type="button"
                size="sm"
                variant={mode === "math" ? "default" : "outline"}
                aria-pressed={mode === "math"}
                onClick={() => onModeChange("math")}
              >
                Matematik
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "subjects" ? "default" : "outline"}
                aria-pressed={mode === "subjects"}
                onClick={() => onModeChange("subjects")}
              >
                Ämnen
              </Button>
            </div>
          </div>
        </header>
      )}
      <div className="mx-auto grid max-w-[110rem] gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <div className="min-w-0 overflow-x-auto">
          <section
            aria-label="Spelplan"
            inert={!playing}
            className={`mx-auto ${playing ? "" : "opacity-60"}`}
            style={{
              width: `calc(min(100%, 100vh - ${playing ? "3rem" : "9rem"}) * ${boardZoom})`,
            }}
          >
            <div
              className="grid gap-1.5 sm:gap-2"
              style={{
                gridTemplateColumns: `repeat(${PLING_COLUMNS[questions.length] ?? 10}, minmax(0, 1fr))`,
              }}
            >
              {questions.map((question, i) => (
                <Tile
                  key={i}
                  n={i + 1}
                  question={question}
                  flipped={flipped[i]!}
                  resolved={resolved[i]!}
                  selected={active === i}
                  locked={awaitingAnswer && active !== i}
                  onClick={() => pickTile(i)}
                />
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-4">
          <div
            role="group"
            aria-label="Zoom för spelplanen"
            className="flex flex-wrap items-center gap-2"
          >
            <Button
              type="button"
              size="sm"
              className="h-7 px-3 text-xs font-semibold"
              variant={boardZoom === 1 ? "default" : "outline"}
              aria-pressed={boardZoom === 1}
              onClick={() => setBoardZoom(1)}
            >
              Anpassa till skärmen
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-7 w-7 px-0"
              variant="outline"
              aria-label="Zooma ut spelplanen"
              disabled={boardZoom <= MIN_ZOOM}
              onClick={() => zoomBoard(-1)}
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span
              className="w-12 text-center text-xs font-semibold tabular-nums"
              aria-live="polite"
            >
              {Math.round(boardZoom * 100)} %
            </span>
            <Button
              type="button"
              size="sm"
              className="h-7 w-7 px-0"
              variant="outline"
              aria-label="Zooma in spelplanen"
              disabled={boardZoom >= MAX_ZOOM}
              onClick={() => zoomBoard(1)}
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
          {q && active !== null && (
            <div className="rounded-xl border bg-card p-5">
              {finished && playing && (
                <div
                  role="dialog"
                  aria-label="Spelet är slut"
                  className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                >
                  <div className="w-full max-w-lg space-y-4 rounded-2xl bg-primary p-8 text-center text-primary-foreground shadow-2xl">
                    <p className="font-display text-3xl font-semibold">Spelet är slut!</p>
                    <p className="text-lg">Vinnare:</p>
                    <p className="font-display text-4xl font-semibold">{winners.join(", ")}</p>
                    <Button
                      variant="secondary"
                      className="w-full"
                      onClick={() => {
                        start();
                        setPlaying(false);
                      }}
                    >
                      Tillbaka till start
                    </Button>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>Ruta {active + 1}</span>
                  {q.pling && (
                    <span className="rounded-full bg-amber-500 px-3 py-0.5 font-semibold text-black">
                      ★ Pling-plong
                    </span>
                  )}
                </div>
                <p
                  className={`font-display font-semibold leading-tight ${q.word || q.geo ? "text-2xl" : "text-4xl"}`}
                >
                  {q.text}
                </p>
                <p className="min-h-10 font-display text-3xl font-semibold text-primary">
                  {showAnswer ? `= ${q.answer}` : ""}
                </p>
                {resolved[active] && (
                  <p className="text-sm text-muted-foreground">Frågan är avgjord.</p>
                )}
              </div>
            </div>
          )}

          {q && active !== null && playing && !resolved[active] && (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full"
                disabled={showAnswer}
                onClick={() => setShowAnswer(true)}
              >
                {showAnswer ? "Svar kontrollerat" : "Rätta"}
              </Button>
              {showAnswer ? (
                <div className="grid grid-cols-2 gap-2">
                  <p className="col-span-2 text-[22px] font-medium">{nameOf(turn)} svarar</p>
                  <p className="col-span-2 text-xs text-muted-foreground">
                    Välj hur det gick för att kunna gå vidare till nästa ruta.
                  </p>
                  <Button
                    className="w-full whitespace-normal border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    variant="outline"
                    onClick={() => award("self")}
                  >
                    Rätt svar (+{points(q.pling).self} p)
                  </Button>
                  <Button
                    className="w-full whitespace-normal border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    variant="outline"
                    onClick={() => award("help")}
                  >
                    Rätt med gruppens hjälp (+{points(q.pling).help} p)
                  </Button>
                  <Button
                    className="w-full whitespace-normal border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    variant="outline"
                    onClick={finish}
                  >
                    Fel svar
                  </Button>
                  <Button
                    className="w-full whitespace-normal border-green-600 bg-green-600 text-white hover:bg-green-700 hover:text-white"
                    variant="outline"
                    onClick={finish}
                  >
                    Ingen kunde svara
                  </Button>
                </div>
              ) : (
                <p className="text-center text-xs text-muted-foreground">
                  Rätta svaret innan du delar ut poäng.
                </p>
              )}
            </div>
          )}

          <div className="rounded-xl border bg-card p-5">
            <h2 className="mb-3 font-semibold">Poäng</h2>
            <ul className="space-y-2">
              {scores.map((s, g) => (
                <li
                  key={g}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${g === turn ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <button
                    type="button"
                    aria-label={`Det är ${nameOf(g)}s tur`}
                    aria-pressed={g === turn}
                    className="px-1"
                    onClick={() => setTurn(g)}
                  >
                    {g === turn ? "▶" : "▷"}
                  </button>
                  {playing ? (
                    <span className="min-w-0 flex-1 truncate px-1 font-medium">{nameOf(g)}</span>
                  ) : (
                    <input
                      type="text"
                      maxLength={30}
                      value={names[g] ?? ""}
                      placeholder={`Grupp ${g + 1}`}
                      aria-label={`Namn på grupp ${g + 1}`}
                      className="min-w-0 flex-1 rounded bg-transparent px-1 font-medium placeholder:text-current placeholder:opacity-70 focus:bg-background focus:text-foreground focus:outline focus:outline-2"
                      onChange={(e) =>
                        setNames((n) => n.map((v, k) => (k === g ? e.target.value : v)))
                      }
                    />
                  )}
                  <button
                    type="button"
                    aria-label={`Minska poäng för ${nameOf(g)}`}
                    className="px-2"
                    onClick={() => adjust(g, -1)}
                  >
                    −
                  </button>
                  <span className="w-8 text-center text-xl font-bold tabular-nums">{s}</span>
                  <button
                    type="button"
                    aria-label={`Öka poäng för ${nameOf(g)}`}
                    className="px-2"
                    onClick={() => adjust(g, 1)}
                  >
                    +
                  </button>
                </li>
              ))}
            </ul>
            {!playing && (
              <div className="mt-3 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={groups >= MAX_GROUPS}
                  onClick={addGroup}
                >
                  + Lägg till grupp
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={groups <= 1}
                  onClick={removeGroup}
                >
                  − Ta bort grupp
                </Button>
              </div>
            )}
          </div>

          {playing ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                Återställ grundinställningar
              </Button>
              <Button
                size="sm"
                className="h-7 px-3 text-xs font-bold"
                onClick={() => {
                  if (window.confirm("Avsluta spelet och gå tillbaka till inställningarna?"))
                    setPlaying(false);
                }}
              >
                Avsluta spelet
              </Button>
            </div>
          ) : (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              {mode === "math" ? (
                <fieldset>
                  <div className="grid grid-cols-2 items-center gap-x-3 gap-y-1">
                    <legend className="mb-2 font-semibold">Räknesätt</legend>
                    <label className="mb-2 flex items-center gap-2 justify-self-start font-medium">
                      <input
                        type="checkbox"
                        checked={randomOps}
                        onChange={() => setRandomOps((v) => !v)}
                      />
                      Slumpa
                    </label>
                    {OPS.map((op) => (
                      <label key={op} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={ops.includes(op)}
                          disabled={ops.length === 1 && ops.includes(op)}
                          onChange={() => toggleOp(op)}
                        />
                        {PLING_OPS[op]}
                      </label>
                    ))}
                  </div>
                  <p className="pt-1 text-xs text-muted-foreground">
                    Välj ett eller flera räknesätt. Slumpa blandar dem slumpmässigt; annars fördelas
                    de lika över rutorna.
                  </p>
                </fieldset>
              ) : (
                <div className="space-y-3">
                  <label className="block font-medium">
                    Frågor
                    <select
                      className={`${field} mt-1 w-full`}
                      value={questionSource}
                      onChange={(e) => setQuestionSource(e.target.value as "subject" | "custom")}
                    >
                      <option value="subject">Färdiga ämnesfrågor</option>
                      <option value="custom">Egna frågor</option>
                    </select>
                  </label>
                  {questionSource === "subject" ? (
                    <>
                      <label className="block font-medium">
                        Ämne
                        <select
                          className={`${field} mt-1 w-full`}
                          value={subject}
                          onChange={(e) => setSubject(e.target.value as PlingSubject)}
                        >
                          {SUBJECT_GROUPS.map((group) => (
                            <optgroup key={group.label} label={group.label}>
                              {group.subjects.map((key) => (
                                <option key={key} value={key}>
                                  {PLING_SUBJECTS[key]}
                                </option>
                              ))}
                            </optgroup>
                          ))}
                        </select>
                      </label>
                      <p className="text-xs text-muted-foreground">
                        Färdiga frågor är anpassade för årskurs 4–6.
                      </p>
                    </>
                  ) : (
                    <div>
                      <label className="block font-medium" htmlFor="custom-pling-questions">
                        Egna frågor och svar
                      </label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Klistra in frågor och svar från elevernas Word-dokument.
                      </p>
                      <p className="mt-2 whitespace-pre-line rounded-md bg-muted p-2 text-xs">
                        {"Fråga: Vad heter Sveriges huvudstad?\nSvar: Stockholm"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Du kan också använda snabbformatet: Fråga;Svar
                      </p>
                      <textarea
                        id="custom-pling-questions"
                        className={`${field} mt-1 min-h-36 w-full resize-y`}
                        value={customQuestionsText}
                        onChange={(e) => setCustomQuestionsText(e.target.value)}
                        placeholder={"Fråga: En fråga\nSvar: Rätt svar\n\nEn annan fråga;Ett annat svar"}
                        aria-describedby="custom-pling-help"
                      />
                      <p id="custom-pling-help" className="text-xs text-muted-foreground">
                        Tomma rader ignoreras. Endast giltiga och unika frågor används i spelet.
                      </p>
                      {customQuestions.totalPosts > 0 && (
                        <div className="mt-3 space-y-2 text-xs" aria-live="polite">
                          <p>
                            {customQuestions.totalPosts}{" "}
                            {customQuestions.totalPosts === 1 ? "fråga hittades" : "frågor hittades"}
                            {" · "}
                            {customQuestions.questions.length} godkända
                            {" · "}
                            {customQuestions.invalidPosts.length} behöver rättas
                          </p>
                          {customQuestions.questions.length < tileCount && (
                            <p className="text-muted-foreground">
                              Lägg till {tileCount - customQuestions.questions.length} ytterligare
                              giltiga {tileCount - customQuestions.questions.length === 1 ? "fråga" : "frågor"}{" "}
                              för den valda spelplanen.
                            </p>
                          )}
                          {customQuestions.invalidPosts.length > 0 && (
                            <ul id="custom-pling-errors" className="space-y-1 text-destructive">
                              {customQuestions.invalidPosts.map((post, index) => (
                                <li key={`${post.line}-${index}`}>
                                  Rad {post.line}: {post.message}
                                </li>
                              ))}
                            </ul>
                          )}
                          {customQuestions.questions.length > 0 && (
                            <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-2">
                              <p className="font-medium">Förhandsgranskning</p>
                              {customQuestions.questions.map(([question, answer], index) => (
                                <div key={`${index}-${question}`}>
                                  <p>{question}</p>
                                  <p className="text-muted-foreground">Svar: {answer}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      {customQuestions.totalPosts === 0 && (
                        <p id="custom-pling-errors" className="mt-2 text-xs text-muted-foreground">
                          Lägg till frågor för att se en förhandsgranskning.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                {mode === "math" && (
                  <label className="block font-medium">
                    Svårighet
                    <select
                      className={`${field} mt-1 w-full`}
                      value={level}
                      onChange={(e) => setLevel(e.target.value as PlingLevel)}
                    >
                      {LEVELS.map((l) => (
                        <option key={l} value={l}>
                          {PLING_LEVELS[l]}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="block font-medium">
                  Antal rutor
                  <select
                    className={`${field} mt-1 w-full`}
                    value={tileCount}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      setTileCount(n);
                      setPlingCount(Math.round(n * 0.25));
                    }}
                  >
                    {PLING_TILE_OPTIONS.map((n) => (
                      <option key={n} value={n}>
                        {n} rutor
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block font-medium">
                  Antal Pling-plong-rutor
                  <input
                    type="number"
                    min={0}
                    max={tileCount}
                    className={`${field} mt-1 w-full`}
                    value={plingCount}
                    onChange={(e) =>
                      setPlingCount(Math.max(0, Math.min(tileCount, Number(e.target.value) || 0)))
                    }
                  />
                </label>
                {mode === "math" && (
                  <>
                    <label className="block font-medium">
                      Andel textuppgifter
                      <select
                        className={`${field} mt-1 w-full`}
                        value={textPercent}
                        onChange={(e) => setTextPercent(Number(e.target.value))}
                      >
                        {[0, 10, 20, 25, 30, 40, 50, 75, 100].map((p) => (
                          <option key={p} value={p}>
                            {p} %
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block font-medium">
                      Andel geometrifrågor
                      <select
                        className={`${field} mt-1 w-full`}
                        value={geoPercent}
                        onChange={(e) => setGeoPercent(Number(e.target.value))}
                      >
                        {[0, 10, 20, 25, 30, 40, 50, 75, 100].map((p) => (
                          <option key={p} value={p}>
                            {p} %
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                <Button
                  className="w-full self-end"
                  disabled={
                    mode === "subjects" && questionSource === "custom" && !customQuestionsValid
                  }
                  onClick={() => {
                    start();
                    setPlaying(true);
                  }}
                >
                  Kör
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="col-span-2 w-full"
                  onClick={resetToDefaults}
                >
                  Återställ grundinställningar
                </Button>
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Tile({
  n,
  question,
  flipped,
  resolved,
  selected,
  locked,
  onClick,
}: {
  n: number;
  question: PlingQuestion;
  flipped: boolean;
  resolved: boolean;
  selected: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const face = "absolute inset-0 flex items-center justify-center rounded-lg p-1 text-center";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={locked}
      aria-label={flipped ? `Ruta ${n}: ${question.text}` : `Ruta ${n}`}
      className={`relative aspect-square rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${selected ? "ring-4 ring-foreground" : ""} ${locked ? "cursor-not-allowed opacity-60" : ""}`}
      style={{ perspective: "600px", containerType: "size" }}
    >
      <span
        className="absolute inset-0 transition-transform duration-500"
        style={{ transformStyle: "preserve-3d", transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <span
          className={`${face} bg-primary font-display font-semibold text-primary-foreground shadow hover:brightness-110`}
          style={{ backfaceVisibility: "hidden", fontSize: "40cqw" }}
        >
          {n}
        </span>
        <span
          className={`${face} border-2 font-display font-semibold leading-tight ${question.pling ? "border-amber-600 bg-amber-300 text-black" : "border-border bg-card text-foreground"} ${resolved ? "opacity-50" : ""}`}
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            fontSize:
              question.word || question.geo || question.text.length <= 7
                ? question.geo
                  ? "17cqw"
                  : "30cqw"
                : question.text.length <= 12
                  ? "22cqw"
                  : "17cqw",
          }}
        >
          {question.geo ? "Geometri" : question.word ? "Text" : question.text}
        </span>
      </span>
    </button>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm";
};

function Button({
  variant = "default",
  size = "default",
  className = "",
  ...props
}: ButtonProps) {
  const customHeight = /\bh-\S+/.test(className);
  const customPadding = /\bpx-\S+/.test(className);
  const sizeClasses =
    size === "sm"
      ? `${customHeight ? "" : "h-8"} rounded-md ${customPadding ? "" : "px-3"} text-xs`
      : "h-9 px-4 py-2";
  const variantClasses = {
    default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
    outline:
      "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  }[variant];

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${variantClasses} ${sizeClasses} ${className}`}
      {...props}
    />
  );
}
