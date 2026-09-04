/* ═══════════════════════════════════════════════════════════════════════════
   MENTORA AI — STATIC EDUCATION DATA (Pakistani boards)
   Prototype/demo data. Past papers & notes are illustrative samples only —
   NOT official board content. Swap generators for a real API/dataset later.
═══════════════════════════════════════════════════════════════════════════ */

export type BoardId = "fbise" | "punjab" | "sindh" | "kpk" | "balochistan";
export type SubjectId = "math" | "physics" | "chemistry" | "biology" | "english" | "computer" | "urdu";

export const BOARDS: { id: BoardId; name: string; short: string }[] = [
  { id: "fbise",       name: "Federal Board (FBISE)", short: "FBISE"       },
  { id: "punjab",      name: "Punjab Board",          short: "Punjab"      },
  { id: "sindh",       name: "Sindh Board",            short: "Sindh"       },
  { id: "kpk",         name: "KPK Board",               short: "KPK"         },
  { id: "balochistan", name: "Balochistan Board",      short: "Balochistan" },
];

export const CLASSES: { id: string; label: string }[] = [
  { id: "9",  label: "Class 9"  },
  { id: "10", label: "Class 10" },
  { id: "11", label: "Class 11" },
  { id: "12", label: "Class 12" },
];

/* iconKey maps to SubjectIcon renderer in App.tsx */
export const SUBJECTS: { id: SubjectId; name: string; iconKey: string }[] = [
  { id: "math",     name: "Mathematics",       iconKey: "math"     },
  { id: "physics",  name: "Physics",            iconKey: "physics"  },
  { id: "chemistry",name: "Chemistry",          iconKey: "chemistry"},
  { id: "biology",  name: "Biology",             iconKey: "biology"  },
  { id: "english",  name: "English",             iconKey: "english"  },
  { id: "computer", name: "Computer Science",   iconKey: "computer" },
  { id: "urdu",     name: "Urdu",                 iconKey: "urdu"     },
];

export const TOPICS_BY_SUBJECT: Record<SubjectId, string[]> = {
  math:      ["Algebra Basics", "Variables & Expressions", "Linear Equations", "Equation Solving", "Word Problems", "Graphing Lines"],
  physics:   ["Kinematics", "Forces & Motion", "Work & Energy", "Waves & Sound", "Current Electricity", "Heat & Thermodynamics"],
  chemistry: ["Atomic Structure", "Chemical Bonding", "States of Matter", "Stoichiometry", "Acids & Bases", "Periodic Table Trends"],
  biology:   ["Cell Structure", "Biological Molecules", "Enzymes", "Human Digestion", "Reproduction", "Ecosystem & Environment"],
  english:   ["Grammar Foundations", "Comprehension", "Essay Writing", "Précis Writing", "Letter & Application Writing", "Vocabulary Building"],
  computer:  ["Computer Fundamentals", "Programming Basics", "Flowcharts & Algorithms", "Data Representation", "Databases Intro", "Networking Basics"],
  urdu:      ["نثر (Prose)", "نظم (Poetry)", "قواعد (Grammar)", "خط و درخواست (Letters)", "مضمون نویسی (Essay Writing)", "تلخیص (Summary)"],
};

/* ── deterministic pseudo-random helper (stable across renders) ─────────── */
function seedFrom(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return h;
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

/* ── PAST PAPERS (demo/sample) ───────────────────────────────────────────── */
export type PastPaper = {
  id: string;
  board: BoardId;
  classId: string;
  subject: SubjectId;
  year: number;
  session: "Annual" | "Supplementary";
  paperType: "Objective" | "Subjective";
  totalMarks: number;
  duration: string;
  sections: { name: string; detail: string }[];
};

export const PAPER_YEARS = [2025, 2024, 2023, 2022];

/* ── REAL PAST-PAPER DATA (structured questions with answers) ────────────── */
import { REAL_PAPERS, REAL_QUESTIONS } from "./past-papers-real";
import { MODEL_ANSWERS } from "./model-answers";

export function getPastPapers(board: BoardId, classId: string, subject: SubjectId): PastPaper[] {
  /* Real papers (with hand-written questions) take priority over the generator. */
  const real: PastPaper[] = REAL_PAPERS
    .filter(p => p.board === board && p.classId === classId && p.subject === subject)
    .map(p => ({
      id: p.id, board: p.board, classId: p.classId, subject: p.subject,
      year: p.year, session: p.session, paperType: p.paperType,
      totalMarks: p.totalMarks, duration: p.duration, sections: p.sections,
    }));
  const realIds = new Set(real.map(p => p.id));

  /* Generated papers for years not covered by real data. */
  const generated: PastPaper[] = [];
  for (const year of PAPER_YEARS) {
    for (const paperType of ["Objective", "Subjective"] as const) {
      const key = `${board}-${classId}-${subject}-${year}-${paperType}`;
      if (realIds.has(key)) continue;
      const s = seedFrom(key);
      generated.push({
        id: key, board, classId, subject, year,
        session: s % 5 === 0 ? "Supplementary" : "Annual",
        paperType,
        totalMarks: paperType === "Objective" ? 20 : 80,
        duration: paperType === "Objective" ? "25 minutes" : "2 hours 35 minutes",
        sections: paperType === "Objective"
          ? [{ name: "Section A", detail: "20 MCQs · 1 mark each" }]
          : [
              { name: "Section B", detail: `${6 + (s % 3) * 2} short questions · attempt ${4 + (s % 3)}` },
              { name: "Section C", detail: `${3 + (s % 2)} long questions · attempt 2` },
            ],
      });
    }
  }
  return [...real, ...generated];
}

/* ── PAST PAPER QUESTIONS (demo/sample, deterministic) ───────────────────────
   Generated structurally from the same seed as the paper itself, so a given
   paper always shows the same questions. Not official board content — swap
   this generator for a real question bank/API later.
──────────────────────────────────────────────────────────────────────────── */
export type MCQQuestion = {
  id: string;
  number: number;
  marks: number;
  text: string;
  topic: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type SubjectiveQuestion = {
  id: string;
  number: number;
  section: "B" | "C";
  sectionLabel: string;
  marks: number;
  text: string;
  answer: string[];
};

export type PaperQuestionSet =
  | { paperType: "Objective"; questions: MCQQuestion[] }
  | { paperType: "Subjective"; questions: SubjectiveQuestion[] };

const NUMERIC_SUBJECTS: SubjectId[] = ["math", "physics", "chemistry"];

function shuffleDet<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) >>> 0;
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildNumericMCQ(subject: SubjectId, topic: string, seed: number, number: number): MCQQuestion {
  const a = 2 + (seed % 8);
  const b = 3 + (Math.floor(seed / 7) % 12);
  const x = 1 + (Math.floor(seed / 13) % 9);
  const rhs = a * x + b;
  const correct = x;
  const distractors = new Set<number>([correct]);
  let d = 1;
  while (distractors.size < 4) {
    const cand = correct + (((seed + d * 17) % 7) - 3 || d);
    if (cand > 0 && !distractors.has(cand)) distractors.add(cand);
    d++;
  }
  const opts = shuffleDet([...distractors], seed);
  const verb = subject === "math" ? "Solve for x in the equation below"
    : subject === "physics" ? "Apply the relevant relation for"
    : "Using the relevant relation for";
  return {
    id: `${topic}-${number}`,
    number, marks: 1, topic,
    text: `${verb} (Topic: ${topic}). If ${a}x + ${b} = ${rhs}, find x.`,
    options: opts.map(String),
    correctIndex: opts.indexOf(correct),
    explanation: `Subtract ${b} from both sides: ${a}x = ${rhs - b}. Divide by ${a}: x = ${correct}.`,
  };
}

const CONCEPT_STEMS = [
  (topic: string) => `Which of the following best describes "${topic}"?`,
  (topic: string) => `"${topic}" is best understood as:`,
  (topic: string) => `Select the statement that correctly explains "${topic}".`,
];
const CONCEPT_OPTIONS = [
  (topic: string) => `A precise, syllabus-aligned definition of ${topic}.`,
  (topic: string) => `A common misconception often confused with ${topic}.`,
  (topic: string) => `A related idea from a different topic, not ${topic} itself.`,
  (topic: string) => `An overly broad statement that does not capture ${topic} accurately.`,
];

function buildConceptMCQ(topic: string, seed: number, number: number, subject?: SubjectId): MCQQuestion {
  const stem = CONCEPT_STEMS[seed % CONCEPT_STEMS.length](topic);
  const order = shuffleDet([0, 1, 2, 3], seed);
  const options = order.map(i => CONCEPT_OPTIONS[i](topic));
  const correctIndex = order.indexOf(0);
  const letter = String.fromCharCode(65 + correctIndex);
  /* Past Papers pass the subject so the explanation can use the real topic
     definition; Assessment/Practice keep the original generic wording. */
  const ma = subject ? MODEL_ANSWERS[`${subject}::${topic}`] : undefined;
  const explanation = ma
    ? `${ma.definition} Hence option ${letter} is correct.`
    : `"${topic}" maps to the standard textbook definition used for this syllabus — option ${letter}.`;
  return { id: `${topic}-${number}`, number, marks: 1, topic, text: stem, options, correctIndex, explanation };
}

const SHORT_STEMS = [
  (topic: string) => `Briefly explain the concept of "${topic}".`,
  (topic: string) => `Write short notes on "${topic}".`,
  (topic: string) => `Differentiate between the key ideas covered under "${topic}".`,
];
const LONG_STEMS = [
  (topic: string) => `Describe "${topic}" in detail, with suitable examples.`,
  (topic: string) => `Explain "${topic}" and discuss its importance, giving relevant examples.`,
  (topic: string) => `Give a detailed account of "${topic}", covering its main aspects.`,
];
const ANSWER_TEMPLATES = [
  ["Start with a clear definition of the topic.", "Explain the underlying concept step by step.", "Support your explanation with a relevant example.", "End with a concise summary line."],
  ["Introduce the topic in one or two sentences.", "Break the explanation into key points.", "Use a diagram or worked example where useful.", "Relate it back to the syllabus objective."],
];

function buildSubjectiveQ(subject: SubjectId, topic: string, seed: number, number: number, section: "B" | "C", sectionLabel: string, marks: number): SubjectiveQuestion {
  const stems = section === "B" ? SHORT_STEMS : LONG_STEMS;
  const stem = stems[seed % stems.length](topic);
  /* Real model answer for the topic replaces the old generic instructions —
     short version for Section B, detailed step-by-step version for Section C. */
  const ma = MODEL_ANSWERS[`${subject}::${topic}`];
  const answer = ma
    ? [...(section === "B" ? ma.short : ma.long)]
    : ANSWER_TEMPLATES[seed % ANSWER_TEMPLATES.length];
  return { id: `${topic}-${section}-${number}`, number, section, sectionLabel, marks, text: stem, answer };
}

export function getPaperQuestions(paper: PastPaper): PaperQuestionSet {
  /* If real hand-written questions exist for this paper id, use them. */
  const real = REAL_QUESTIONS[paper.id];
  if (real) {
    if (real.paperType === "Objective") {
      const qs = real.questions as Array<{ id: string; number: number; marks: number; text: string; topic: string; options: string[]; correctIndex: number; explanation: string }>;
      return { paperType: "Objective", questions: qs.map(q => ({ ...q })) } as PaperQuestionSet;
    }
    const qs = real.questions as Array<{ id: string; number: number; section: "B" | "C"; sectionLabel: string; marks: number; text: string; topic: string; answer: string[] }>;
    return { paperType: "Subjective", questions: qs.map(q => ({ ...q, answer: q.answer })) } as PaperQuestionSet;
  }

  /* Fallback: procedurally generated questions for papers without real data. */
  const s = seedFrom(paper.id);
  const topics = TOPICS_BY_SUBJECT[paper.subject];

  if (paper.paperType === "Objective") {
    const count = paper.totalMarks; // 1 mark each
    const questions: MCQQuestion[] = [];
    for (let i = 0; i < count; i++) {
      const qSeed = seedFrom(`${paper.id}-q${i}`);
      const topic = topics[qSeed % topics.length];
      questions.push(
        NUMERIC_SUBJECTS.includes(paper.subject)
          ? buildNumericMCQ(paper.subject, topic, qSeed, i + 1)
          : buildConceptMCQ(topic, qSeed, i + 1, paper.subject)
      );
    }
    return { paperType: "Objective", questions };
  }

  const shortCount = 6 + (s % 3) * 2;
  const shortAttempt = 4 + (s % 3);
  const longCount = 3 + (s % 2);
  const longAttempt = 2;
  const questions: SubjectiveQuestion[] = [];
  let num = 1;
  for (let i = 0; i < shortCount; i++) {
    const qSeed = seedFrom(`${paper.id}-b${i}`);
    const topic = topics[qSeed % topics.length];
    questions.push(buildSubjectiveQ(paper.subject, topic, qSeed, num++, "B", `Section B — short questions (attempt ${shortAttempt} of ${shortCount})`, 2 + (qSeed % 3)));
  }
  for (let i = 0; i < longCount; i++) {
    const qSeed = seedFrom(`${paper.id}-c${i}`);
    const topic = topics[qSeed % topics.length];
    questions.push(buildSubjectiveQ(paper.subject, topic, qSeed, num++, "C", `Section C — long questions (attempt ${longAttempt} of ${longCount})`, 8 + (qSeed % 5)));
  }
  return { paperType: "Subjective", questions };
}

/* ── ASSESSMENT / TEST (demo/sample, deterministic) ──────────────────────────
   Reuses the same MCQ builders as Past Papers so question style stays
   consistent across the app. "topic" of "all" mixes every topic for the
   subject together.
──────────────────────────────────────────────────────────────────────────── */
export function getAssessmentQuestions(subject: SubjectId, topic: string, count: number): MCQQuestion[] {
  const topics = topic === "all" ? TOPICS_BY_SUBJECT[subject] : [topic];
  const questions: MCQQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const qSeed = seedFrom(`assess-${subject}-${topic}-${i}`);
    const qTopic = topics[qSeed % topics.length];
    questions.push(
      NUMERIC_SUBJECTS.includes(subject)
        ? buildNumericMCQ(subject, qTopic, qSeed, i + 1)
        : buildConceptMCQ(qTopic, qSeed, i + 1)
    );
  }
  return questions;
}

/* ── Locally saved assessment/practice results ────────────────────────────
   Stored in localStorage so Progress and the Mistake Analyzer can compute
   real stats (score history, subject/topic accuracy, wrong-answer patterns)
   without any backend.
──────────────────────────────────────────────────────────────────────────── */
export type AssessmentAnswer = {
  questionId: string;
  questionText: string;
  topic: string;
  options: string[];
  selectedIndex: number | null;
  correctIndex: number;
  isCorrect: boolean;
  explanation?: string; // saved by Practice so its review can show the reasoning
};

export type AssessmentResult = {
  id: string;
  mode: "test" | "practice";
  subject: SubjectId;
  topic: string;
  takenAt: string; // ISO timestamp
  total: number;
  correctCount: number;
  wrongCount: number;
  percentage: number;
  answers: AssessmentAnswer[];
};

const RESULTS_STORAGE_KEY = "mentora.assessmentResults.v1";

/* When a student is signed in, pass their user id so every account keeps
   its own results (and therefore its own Mistake Analyzer & Progress data). */
function scopedKey(key: string, userId?: string | null): string {
  return userId ? `${key}.user.${userId}` : key;
}

export function loadAssessmentResults(userId?: string | null): AssessmentResult[] {
  try {
    const raw = localStorage.getItem(scopedKey(RESULTS_STORAGE_KEY, userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Normalize entries saved before `mode` / per-answer `topic` existed.
    return parsed.map((r: Partial<AssessmentResult> & Record<string, unknown>) => ({
      ...r,
      mode: r.mode === "practice" ? "practice" : "test",
      answers: Array.isArray(r.answers)
        ? r.answers.map((a: Partial<AssessmentAnswer>) => ({ ...a, topic: a.topic ?? (r.topic as string) ?? "General" }))
        : [],
    })) as AssessmentResult[];
  } catch {
    return [];
  }
}

export function saveAssessmentResult(result: AssessmentResult, userId?: string | null): void {
  try {
    const existing = loadAssessmentResults(userId);
    const updated = [result, ...existing].slice(0, 100);
    localStorage.setItem(scopedKey(RESULTS_STORAGE_KEY, userId), JSON.stringify(updated));
  } catch {
    /* ignore */
  }
}

/* ── Wrong-answer tracking & weak/strong topic detection ─────────────────── */
export type TopicStat = { subject: SubjectId; subjectName: string; topic: string; attempts: number; correct: number; wrong: number; pct: number };

export function getTopicStats(results: AssessmentResult[]): TopicStat[] {
  const map = new Map<string, TopicStat>();
  for (const r of results) {
    for (const a of r.answers) {
      const key = `${r.subject}::${a.topic}`;
      const cur = map.get(key) ?? {
        subject: r.subject,
        subjectName: SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject,
        topic: a.topic,
        attempts: 0, correct: 0, wrong: 0, pct: 0,
      };
      cur.attempts += 1;
      if (a.isCorrect) cur.correct += 1; else cur.wrong += 1;
      map.set(key, cur);
    }
  }
  return Array.from(map.values())
    .map(t => ({ ...t, pct: t.attempts > 0 ? Math.round((t.correct / t.attempts) * 100) : 0 }))
    .sort((a, b) => a.pct - b.pct);
}

export type MistakeExample = { questionText: string; yourAnswer: string; correctAnswer: string; takenAt: string };
export type MistakeEntry = {
  subject: SubjectId;
  subjectName: string;
  topic: string;
  wrongCount: number;
  attemptCount: number;
  lastMissed: string;
  examples: MistakeExample[];
};

export function getMistakeBreakdown(results: AssessmentResult[]): MistakeEntry[] {
  const map = new Map<string, MistakeEntry>();
  // Process oldest → newest so `lastMissed`/examples reflect the most recent attempts.
  const chronological = [...results].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
  for (const r of chronological) {
    for (const a of r.answers) {
      const key = `${r.subject}::${a.topic}`;
      const cur = map.get(key) ?? {
        subject: r.subject,
        subjectName: SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject,
        topic: a.topic,
        wrongCount: 0, attemptCount: 0, lastMissed: r.takenAt, examples: [] as MistakeExample[],
      };
      cur.attemptCount += 1;
      if (!a.isCorrect) {
        cur.wrongCount += 1;
        cur.lastMissed = r.takenAt;
        const example: MistakeExample = {
          questionText: a.questionText,
          yourAnswer: a.selectedIndex !== null ? a.options[a.selectedIndex] : "Not answered",
          correctAnswer: a.options[a.correctIndex],
          takenAt: r.takenAt,
        };
        cur.examples = [example, ...cur.examples].slice(0, 3);
      }
      map.set(key, cur);
    }
  }
  return Array.from(map.values())
    .filter(m => m.wrongCount > 0)
    .sort((a, b) => b.wrongCount - a.wrongCount || new Date(b.lastMissed).getTime() - new Date(a.lastMissed).getTime());
}

/* ── PRACTICE — separate from Assessment ──────────────────────────────────
   Practice draws from a hand-written question bank (practice-real.ts), so
   its questions are always NEW compared with the generated assessment test.
   Topics are weighted toward the student's weak topics (topics with recorded
   mistakes), and recently practised bank questions are skipped first so
   sessions keep feeling fresh. Assessment keeps using the generator above. */
import { PRACTICE_BANK } from "./practice-real";

export type WeakTopic = {
  subject: SubjectId;
  topic: string;
  wrongCount: number;
  attempts: number;
  weight: number;
};

/* Topics the student has actually slipped on, strongest (most missed) first. */
export function getWeakTopics(userId?: string | null): WeakTopic[] {
  const stats = getTopicStats(loadAssessmentResults(userId));
  return stats
    .filter(t => t.wrong > 0)
    .map(t => ({
      subject: t.subject,
      topic: t.topic,
      wrongCount: t.wrong,
      attempts: t.attempts,
      weight: t.wrong + (t.pct < 55 ? 2 : 0),
    }))
    .sort((a, b) => b.weight - a.weight);
}

const PRACTICE_SEEN_KEY = "mentora.practiceSeen.v1";

function loadPracticeSeen(userId?: string | null): string[] {
  try {
    const raw = localStorage.getItem(scopedKey(PRACTICE_SEEN_KEY, userId));
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/* Records bank questions shown this session (bank ids start with "p-"), so
   the next session prefers still-unseen questions. Procedurally generated
   practice questions vary with every session seed and are never recorded. */
export function markPracticeSeen(questions: MCQQuestion[], userId?: string | null): void {
  try {
    const ids = questions.map(q => q.id).filter(id => id.startsWith("p-"));
    const merged = [...ids, ...loadPracticeSeen(userId)].slice(0, 60);
    localStorage.setItem(scopedKey(PRACTICE_SEEN_KEY, userId), JSON.stringify(merged));
  } catch {
    /* ignore */
  }
}

export function getPracticeQuestions(
  subject: SubjectId,
  topic: string,
  count: number,
  weakTopics: WeakTopic[] = [],
  userId?: string | null,
  sessionSeed: number = Date.now(),
): MCQQuestion[] {
  const allTopics = TOPICS_BY_SUBJECT[subject];

  /* 1. How many questions each topic should contribute. Weak topics (topics
        with recorded mistakes) get the lion's share when mixing "all". */
  const quota = new Map<string, number>();
  if (topic !== "all") {
    quota.set(topic, count);
  } else {
    const weak = weakTopics.filter(w => w.subject === subject && allTopics.includes(w.topic));
    if (weak.length > 0) {
      const totalWeight = weak.reduce((s, w) => s + w.weight, 0) || 1;
      let assigned = 0;
      for (const w of weak) {
        const n = Math.min(Math.max(1, Math.round((count * w.weight) / totalWeight)), count - assigned);
        if (n > 0) quota.set(w.topic, n);
        assigned += n;
      }
      const others = allTopics.filter(t => !quota.has(t));
      let i = 0;
      while (assigned < count && others.length > 0) {
        const t = others[i % others.length];
        quota.set(t, (quota.get(t) ?? 0) + 1);
        assigned++;
        i++;
      }
      while (assigned < count) {
        // every topic is already weak — top up the weakest one
        quota.set(weak[0].topic, (quota.get(weak[0].topic) ?? 0) + 1);
        assigned++;
      }
    } else {
      // no mistakes recorded yet — spread evenly across the subject
      for (let i = 0; i < count; i++) {
        const t = allTopics[i % allTopics.length];
        quota.set(t, (quota.get(t) ?? 0) + 1);
      }
    }
  }

  /* 2. Pull hand-written bank questions — unseen first, shuffled per session. */
  const seen = new Set(loadPracticeSeen(userId));
  const shuffled = shuffleDet(PRACTICE_BANK[subject] ?? [], sessionSeed || 1);
  const ordered = [...shuffled.filter(q => !seen.has(q.id)), ...shuffled.filter(q => seen.has(q.id))];
  const used = new Set<string>();
  const questions: MCQQuestion[] = [];
  let number = 1;
  const shortfall: Array<{ topic: string; need: number }> = [];
  for (const [t, n] of quota) {
    let got = 0;
    for (const q of ordered) {
      if (got >= n) break;
      if (q.topic !== t || used.has(q.id)) continue;
      used.add(q.id);
      questions.push({
        id: q.id, number: number++, marks: 1, topic: q.topic,
        text: q.text, options: [...q.options],
        correctIndex: q.correctIndex, explanation: q.explanation,
      });
      got++;
    }
    if (got < n) shortfall.push({ topic: t, need: n - got });
  }

  /* 3. Overflow — procedurally generated with practice-specific seeds, so the
        numbers/text never match the assessment test for the same topic. */
  let gi = 0;
  for (const { topic: t, need } of shortfall) {
    for (let k = 0; k < need; k++) {
      const qSeed = seedFrom(`practice-${subject}-${t}-${sessionSeed}-${gi}`);
      questions.push(
        NUMERIC_SUBJECTS.includes(subject)
          ? buildNumericMCQ(subject, t, qSeed, number)
          : buildConceptMCQ(t, qSeed, number)
      );
      number++;
      gi++;
    }
  }
  return questions;
}

/* ── STUDY RESOURCES / NOTES ────────────────────────────────────────────
   Real notes come from notes-real.ts, keyed by subject + class so each class
   level sees curriculum-appropriate topics (e.g. Calculus only in Class 12).
   The board follows the shared national curriculum, so the same content set
   serves every board; the selected board tags the note id. The generator
   below stays as a fallback for any uncovered combination.
──────────────────────────────────────────────────────────────────────────── */
import { getRealNotes } from "./notes-real";

export type NoteResource = {
  id: string;
  board: BoardId;
  classId: string;
  subject: SubjectId;
  topic: string;
  readMins: number;
  updated: string;
  points: string[];
};

const NOTE_TEMPLATES = [
  ["Core definitions and key terms", "Worked example with step-by-step solution", "Common mistakes students make here", "Quick-recall summary"],
  ["Concept overview in simple language", "Formula / rule sheet", "Practice question with solution", "Exam tip from past papers"],
  ["Step-by-step breakdown of the topic", "Diagram-based explanation", "Solved past-paper style question", "Self-check questions"],
];

export function getNotes(board: BoardId, classId: string, subject: SubjectId): NoteResource[] {
  const real = getRealNotes(subject, classId);
  if (real.length > 0) {
    return real.map(n => ({
      id: `${board}-${classId}-${subject}-${n.topic}`,
      board, classId, subject,
      topic: n.topic,
      readMins: n.readMins,
      updated: n.updated,
      points: n.points,
    }));
  }

  const topics = TOPICS_BY_SUBJECT[subject];
  return topics.map((topic, i) => {
    const key = `${board}-${classId}-${subject}-${topic}`;
    const s = seedFrom(key);
    return {
      id: key,
      board, classId, subject, topic,
      readMins: 6 + (s % 9),
      updated: ["2 days ago", "1 week ago", "2 weeks ago", "3 weeks ago"][s % 4],
      points: pick(NOTE_TEMPLATES, s),
    };
  });
}

/* ── Local persisted selection ───────────────────────────────────────────── */
export type Selection = {
  board: BoardId | null;
  classId: string | null;
  subjects: SubjectId[];
};

export const DEFAULT_SELECTION: Selection = {
  board: "punjab",
  classId: "10",
  subjects: ["math", "english", "physics", "urdu"],
};

const STORAGE_KEY = "mentora.selection.v1";
const LEGACY_MIGRATED_KEY = "mentora.legacyMigrated.v1";

export function loadSelection(userId?: string | null): Selection | null {
  try {
    const raw = localStorage.getItem(scopedKey(STORAGE_KEY, userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.board || !parsed.classId || !Array.isArray(parsed.subjects)) return null;
    return parsed as Selection;
  } catch {
    return null;
  }
}

export function saveSelection(sel: Selection, userId?: string | null) {
  try { localStorage.setItem(scopedKey(STORAGE_KEY, userId), JSON.stringify(sel)); } catch { /* ignore */ }
}

/* One-time: carry data saved before accounts existed over to the first
   student who signs in, so nobody loses their history when the login system
   goes live. Later sign-ups start fresh. */
export function migrateLegacyDataIfNeeded(userId: string): void {
  try {
    if (localStorage.getItem(LEGACY_MIGRATED_KEY)) return;
    const legacySelection = localStorage.getItem(STORAGE_KEY);
    if (legacySelection && !localStorage.getItem(scopedKey(STORAGE_KEY, userId))) {
      localStorage.setItem(scopedKey(STORAGE_KEY, userId), legacySelection);
    }
    const legacyResults = localStorage.getItem(RESULTS_STORAGE_KEY);
    if (legacyResults && !localStorage.getItem(scopedKey(RESULTS_STORAGE_KEY, userId))) {
      localStorage.setItem(scopedKey(RESULTS_STORAGE_KEY, userId), legacyResults);
    }
    localStorage.setItem(LEGACY_MIGRATED_KEY, JSON.stringify(true));
  } catch {
    /* ignore */
  }
}
