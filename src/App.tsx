import { useState, useRef, useEffect } from "react";
import {
  BOARDS, CLASSES, SUBJECTS, TOPICS_BY_SUBJECT, PAPER_YEARS,
  getPastPapers, getNotes, getPaperQuestions, getAssessmentQuestions,
  getPracticeQuestions, getWeakTopics, markPracticeSeen,
  loadSelection, saveSelection, DEFAULT_SELECTION,
  saveAssessmentResult, loadAssessmentResults, getTopicStats, getMistakeBreakdown,
  type BoardId, type SubjectId, type Selection, type PastPaper, type NoteResource,
  type MCQQuestion, type SubjectiveQuestion, type AssessmentAnswer, type AssessmentResult,
  type TopicStat, type MistakeEntry, type WeakTopic,
} from "./data";
import {
  signUp, login, logout, getCurrentUser, updateUserName,
  type StudentUser,
} from "./auth";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
type Screen = "dashboard" | "mentor" | "assessment" | "practice" | "papers" | "resources" | "mistake" | "progress" | "profile" | "pro";

/* ═══════════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════════════ */
const C = {
  /* Sidebar */
  navy:     "#0B0F2E",
  navyMid:  "#141840",
  navyCard: "#1A1F4A",

  /* Brand */
  brand:     "#5B5FEF",
  brandSoft: "#EEF0FE",
  violet:    "#7C3AED",

  /* Cyan — AI accent */
  cyan:     "#00CFED",
  cyanSoft: "#E0F9FF",

  /* Teal / Mint */
  teal:     "#14B8A6",
  tealSoft: "#CCFBF1",

  /* Semantic */
  emerald:     "#10B981",
  emeraldSoft: "#D1FAE5",
  amber:       "#F59E0B",
  amberSoft:   "#FEF3C7",
  orange:      "#F97316",
  orangeSoft:  "#FFEDD5",
  rose:        "#EF4444",
  roseSoft:    "#FEE2E2",
  purple:      "#A855F7",
  purpleSoft:  "#F3E8FF",

  /* Text */
  ink900: "#0B0F2E",
  ink700: "#1C2047",
  ink500: "#4B5280",
  ink300: "#8890B8",
  ink100: "#C4CAE2",

  /* Surfaces */
  bg:     "#EEF0FF",
  card:   "#FFFFFF",
  surf1:  "#F5F7FF",
  surf2:  "#ECEFFE",
  surf3:  "#E0E4F8",
  border: "#E0E4F8",
} as const;

/* Gradient shorthands */
const G = {
  brand:    `linear-gradient(135deg, ${C.brand} 0%, ${C.violet} 100%)`,
  navPill:  `linear-gradient(135deg, #5B5FEF 0%, #00CFED 100%)`,
  cyan:     `linear-gradient(135deg, ${C.cyan} 0%, ${C.brand} 100%)`,
  teal:     `linear-gradient(135deg, ${C.teal} 0%, ${C.emerald} 100%)`,
  banner:   `linear-gradient(135deg, #00C6E0 0%, #9333EA 100%)`,
  hero:     `linear-gradient(165deg, #0C1240 0%, #12174A 45%, #1A0E3A 100%)`,
  violet:   `linear-gradient(135deg, ${C.violet} 0%, ${C.brand} 100%)`,
  mathBar:  `linear-gradient(90deg, #4F46E5 0%, #06B6D4 100%)`,
  englBar:  `linear-gradient(90deg, #10B981 0%, #14B8A6 100%)`,
  physBar:  `linear-gradient(90deg, #A855F7 0%, #6366F1 100%)`,
  urduBar:  `linear-gradient(90deg, #F97316 0%, #FBBF24 100%)`,
  chemBar:  `linear-gradient(90deg, #EF4444 0%, #F97316 100%)`,
  bioBar:   `linear-gradient(90deg, #10B981 0%, #06B6D4 100%)`,
  compBar:  `linear-gradient(90deg, #5B5FEF 0%, #A855F7 100%)`,
  upgrade:  `linear-gradient(135deg, #7C3AED 0%, #5B5FEF 100%)`,
} as const;

/* ═══════════════════════════════════════════════════════════════════════════
   ICON PRIMITIVES
═══════════════════════════════════════════════════════════════════════════ */
type IP = { size?: number; className?: string };

function Ico({ d, size = 18 }: { d: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const Icons = {
  grid:      ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>,
  bot:       ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a2 2 0 0 1 2 2v1h2a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3h2V4a2 2 0 0 1 2-2z"/><circle cx="9" cy="13" r="1" fill="currentColor"/><circle cx="15" cy="13" r="1" fill="currentColor"/><path d="M9 17s1 1 3 1 3-1 3-1"/></svg>,
  clipboard: ({ size = 18 }: IP = {}) => <Ico size={size} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" />,
  pen:       ({ size = 18 }: IP = {}) => <Ico size={size} d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />,
  search:    ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>,
  chart:     ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  send:      ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/></svg>,
  clip:      ({ size = 16 }: IP = {}) => <Ico size={size} d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />,
  sparkle:   ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l2.09 6.26L21 10l-6.91 1.74L12 18l-2.09-6.26L3 10l6.91-1.74L12 2z"/><path d="M19 14l.94 2.82L23 18l-3.06.18L19 21l-.94-2.82L15 18l3.06-.18L19 14z" opacity=".5"/></svg>,
  fire:      ({ size = 16 }: IP = {}) => <Ico size={size} d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />,
  check:     ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  chevron:   ({ size = 14 }: IP = {}) => <Ico size={size} d="m9 18 6-6-6-6" />,
  chevDown:  ({ size = 14 }: IP = {}) => <Ico size={size} d="m6 9 6 6 6-6" />,
  menu:      ({ size = 20 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  x:         ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  bell:      ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  trend:     ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  target:    ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>,
  book:      ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  alert:     ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="3"/></svg>,
  mic:       ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>,
  arrowRight:({ size = 14 }: IP = {}) => <Ico size={size} d="M5 12h14m-7-7 7 7-7 7" />,
  trophy:    ({ size = 20 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>,
  star:      ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
  lock:      ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  fileText:  ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="13" y2="17"/></svg>,
  folder:    ({ size = 18 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>,
  flag:      ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 3v18"/><path d="M4 4h13l-2.5 4L17 12H4"/></svg>,
  layers:    ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>,
  edit:      ({ size = 14 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  user:      ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  eye:       ({ size = 15 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:    ({ size = 15 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
  logout:    ({ size = 16 }: IP = {}) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
};

/* ═══════════════════════════════════════════════════════════════════════════
   MINI SPARKLINE
═══════════════════════════════════════════════════════════════════════════ */
function Sparkline({ data, color, width = 80, height = 36 }: {
  data: number[]; color: string; width?: number; height?: number;
}) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const pad = 4;
  const w = width - pad * 2, h = height - pad * 2;
  const pts = data.map((v, i) => [
    pad + (i / (data.length - 1)) * w,
    pad + h - ((v - min) / range) * h,
  ] as [number, number]);
  const d = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p[0]} ${p[1]}`;
    const prev = pts[i - 1];
    const cpx = (prev[0] + p[0]) / 2;
    return `${acc} C ${cpx} ${prev[1]}, ${cpx} ${p[1]}, ${p[0]} ${p[1]}`;
  }, "");
  const fillD = `${d} L ${pts[pts.length-1][0]} ${height} L ${pts[0][0]} ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <defs>
        <linearGradient id={`sg-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={fillD} fill={`url(#sg-${color.replace('#','')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ROBOT SVG ILLUSTRATION (for banner card)
═══════════════════════════════════════════════════════════════════════════ */
function RobotIllustration() {
  return (
    <svg viewBox="0 0 90 100" width="90" height="100" className="flex-shrink-0">
      {/* Antenna */}
      <line x1="45" y1="6" x2="45" y2="18" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity=".8"/>
      <circle cx="45" cy="4" r="4" fill="white" opacity=".9"/>
      <circle cx="45" cy="4" r="2" fill="#00CFED"/>
      {/* Head */}
      <rect x="16" y="16" width="58" height="44" rx="14" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5"/>
      {/* Screen / face */}
      <rect x="24" y="24" width="42" height="24" rx="8" fill="rgba(0,207,237,0.85)"/>
      {/* Left eye */}
      <circle cx="36" cy="36" r="6" fill="white"/>
      <circle cx="37" cy="35" r="3.5" fill="#0B0F2E"/>
      <circle cx="38.5" cy="33.5" r="1.2" fill="white" opacity=".8"/>
      {/* Right eye */}
      <circle cx="54" cy="36" r="6" fill="white"/>
      <circle cx="55" cy="35" r="3.5" fill="#0B0F2E"/>
      <circle cx="56.5" cy="33.5" r="1.2" fill="white" opacity=".8"/>
      {/* Mouth */}
      <path d="M37 44 Q45 50 53 44" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
      {/* Neck */}
      <rect x="38" y="58" width="14" height="6" rx="3" fill="rgba(255,255,255,0.25)"/>
      {/* Body */}
      <rect x="20" y="64" width="50" height="28" rx="10" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"/>
      {/* Chest button */}
      <circle cx="45" cy="78" r="5" fill="rgba(0,207,237,0.7)"/>
      <circle cx="45" cy="78" r="2.5" fill="rgba(255,255,255,0.9)"/>
      {/* Arm L */}
      <rect x="6" y="66" width="13" height="10" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
      {/* Arm R */}
      <rect x="71" y="66" width="13" height="10" rx="5" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.25)" strokeWidth="1"/>
      {/* Stars around */}
      <circle cx="8" cy="25" r="1.5" fill="white" opacity=".6"/>
      <circle cx="82" cy="20" r="1" fill="white" opacity=".5"/>
      <circle cx="78" cy="50" r="1.5" fill="white" opacity=".4"/>
      <circle cx="12" cy="55" r="1" fill="white" opacity=".5"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOON + STARS (for hero card)
═══════════════════════════════════════════════════════════════════════════ */
function MoonIllustration() {
  return (
    <svg viewBox="0 0 120 140" width="120" height="140" className="absolute right-4 top-4 opacity-80 pointer-events-none">
      {/* Stars */}
      {[[20,18],[88,12],[100,40],[15,60],[95,75],[35,90],[80,100]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r={1+Math.random()*1.5} fill="white" opacity={0.4+Math.random()*0.4}/>
      ))}
      <circle cx="95" cy="8" r="2" fill="white" opacity=".7"/>
      <circle cx="10" cy="35" r="1.5" fill="white" opacity=".5"/>
      {/* Crescent moon */}
      <path d="M70 20 C50 20 36 36 36 58 C36 80 50 96 70 96 C54 88 44 74 44 58 C44 42 54 28 70 20Z"
        fill="rgba(255,255,255,0.12)" />
      <path d="M75 18 C52 18 34 36 34 60 C34 84 52 102 75 102 C58 96 46 80 46 60 C46 40 58 24 75 18Z"
        fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" strokeWidth="1"/>
      {/* Inner dark circle creating crescent */}
      <circle cx="82" cy="58" r="36" fill="#12174A"/>
      {/* Glow */}
      <circle cx="57" cy="60" r="22" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="8"/>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED CARD
═══════════════════════════════════════════════════════════════════════════ */
function Card({ children, className = "", style = {} }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-card ${className}`}
      style={{ border: `1px solid ${C.border}`, ...style }}>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS BAR
═══════════════════════════════════════════════════════════════════════════ */
function Bar({ pct, grad }: { pct: number; grad: string }) {
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: C.surf3 }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: grad, transition: "width 1s ease" }} />
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════
   INITIALS AVATAR (logged-in student)
═══════════════════════════════════════════════════════════════════════════ */
const AVATAR_GRADS = [G.brand, G.cyan, G.teal, G.violet, G.banner];

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const initials = name.trim().split(/\s+/).map(w => w[0] ?? "").join("").slice(0, 2).toUpperCase() || "S";
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (
    <div className="rounded-xl flex items-center justify-center flex-shrink-0 font-display font-bold text-white select-none"
      style={{ width: size, height: size, fontSize: Math.max(11, Math.round(size * 0.36)), background: AVATAR_GRADS[h % AVATAR_GRADS.length] }}>
      {initials}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DARK SIDEBAR
═══════════════════════════════════════════════════════════════════════════ */
const NAV = [
  { id: "dashboard",  label: "Dashboard",       Icon: Icons.grid      },
  { id: "mentor",     label: "AI Mentor",        Icon: Icons.bot       },
  { id: "assessment", label: "Assessment",       Icon: Icons.clipboard },
  { id: "practice",   label: "Practice",         Icon: Icons.pen       },
  { id: "papers",     label: "Past Papers",      Icon: Icons.fileText  },
  { id: "resources",  label: "Study Resources",  Icon: Icons.folder    },
  { id: "mistake",    label: "Mistake Analyzer", Icon: Icons.search    },
  { id: "progress",   label: "My Progress",      Icon: Icons.chart     },
  { id: "profile",    label: "My Profile",       Icon: Icons.user     },
] as const;

const STREAK_DATA = [3, 5, 4, 7, 6, 8, 7];

function Sidebar({ active, onChange, mobile, onClose }: {
  active: Screen; onChange: (s: Screen) => void; mobile?: boolean; onClose?: () => void;
}) {
  return (
    <aside className="h-full flex flex-col" style={{ background: C.navy }}>
      {/* Logo */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: G.cyan }}>
            <Icons.sparkle size={15} />
          </div>
          <div>
            <p className="font-display font-bold text-[15px] leading-none text-white">Mentora AI</p>
            <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Your AI Learning Mentor
            </p>
          </div>
        </div>
        {mobile && (
          <button onClick={onClose} className="p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.4)" }}>
            <Icons.x size={16} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ id, label, Icon }) => {
          const isActive = active === id;
          return (
            <button key={id}
              onClick={() => { onChange(id as Screen); onClose?.(); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-[13px] font-medium text-left transition-all duration-150"
              style={{
                background: isActive ? G.navPill : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.5)",
              }}>
              <span className="flex-shrink-0" style={{ color: isActive ? "#fff" : "rgba(255,255,255,0.35)" }}>
                <Icon size={16} />
              </span>
              {label}
            </button>
          );
        })}
      </nav>

      {/* Learning Streak card */}
      <div className="mx-3 mb-3 p-4 rounded-2xl overflow-hidden relative" style={{ background: C.navyCard }}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[12px] font-semibold text-white">Learning Streak</p>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: G.brand }}>
            <Icons.sparkle size={11} />
          </div>
        </div>
        <p className="font-display font-bold text-[32px] text-white leading-none">7</p>
        <p className="text-[11px] mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>days · Keep it up! 🔥</p>
        <Sparkline data={STREAK_DATA} color={C.cyan} width={160} height={36} />
      </div>

      {/* Upgrade to Pro card — compact, at the very bottom so it never covers main content */}
      <div className="mx-3 mb-4 p-3 rounded-xl flex items-center gap-2.5" style={{ background: C.navyCard }}>
        <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: G.upgrade }}>
          <Icons.star size={12} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-[11px] text-white leading-tight truncate">Upgrade to Pro</p>
          <p className="text-[10px] leading-tight truncate" style={{ color: "rgba(255,255,255,0.45)" }}>Unlock advanced AI features</p>
        </div>
        <button onClick={() => onChange("pro")} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all hover:opacity-90 active:scale-[.98]"
          style={{ background: G.upgrade }}>
          Upgrade
        </button>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD HEADER (search + notifications + profile)
═══════════════════════════════════════════════════════════════════════════ */
function DashboardHeader({ onMenuClick, selection, onChangeSelection, user, onProfile, userId }: {
  onMenuClick: () => void; selection: Selection; onChangeSelection: () => void;
  user: StudentUser; onProfile: () => void; userId: string | null;
}) {
  const board = BOARDS.find(b => b.id === selection.board);
  const cls = CLASSES.find(c => c.id === selection.classId);

  /* Real notifications: the student's newest assessments & practice sessions. */
  const [notifOpen, setNotifOpen] = useState(false);
  const results = loadAssessmentResults(userId);
  const notifs = [...results]
    .sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime())
    .slice(0, 5)
    .map(r => ({
      type: r.mode === "practice" ? ("check" as const) : ("assessment" as const),
      text: r.mode === "practice"
        ? `Practice · ${r.topic === "all" ? SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject : r.topic} — ${r.correctCount}/${r.total} correct`
        : `Assessment · ${SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject} — ${r.percentage}%`,
      time: timeAgo(r.takenAt),
    }));
  const threeDaysAgo = Date.now() - 3 * 86400000;
  const notifCount = results.filter(r => new Date(r.takenAt).getTime() >= threeDaysAgo).length;

  return (
    <div className="flex items-center gap-4 px-6 pt-5 pb-4">
      <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg" style={{ color: C.ink300 }}>
        <Icons.menu size={20} />
      </button>
      {/* Search */}
      <div className="dash-search flex-1 max-w-sm flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
        style={{ background: C.card, border: `1px solid ${C.border}` }}>
        <span style={{ color: C.ink300 }}><Icons.search size={15} /></span>
        <input className="flex-1 text-[13px] outline-none bg-transparent" placeholder="Search anything..."
          style={{ color: C.ink700 }} />
      </div>
      <div className="ml-auto flex items-center gap-3">
        <BoardClassChip selection={selection} onClick={onChangeSelection} />
        {/* Notification bell — count + feed come from the student's real results */}
        <div className="relative">
          <button onClick={() => setNotifOpen(o => !o)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white"
            style={{ background: C.card, border: `1px solid ${C.border}`, color: C.ink500 }}
            title="Notifications">
            <Icons.bell size={16} />
          </button>
          {notifCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
              style={{ background: C.rose }}>{notifCount > 9 ? "9+" : notifCount}</span>
          )}
          {notifOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-11 z-20 w-80 rounded-2xl p-4"
                style={{ background: C.card, border: `1px solid ${C.border}`, boxShadow: "0 12px 32px rgba(28,30,63,.14)" }}>
                <p className="font-display font-bold text-[13px] mb-3" style={{ color: C.ink900 }}>Notifications</p>
                {notifs.length > 0 ? (
                  <div className="space-y-3">
                    {notifs.map((n, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <ActivityIcon type={n.type} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] leading-snug" style={{ color: C.ink700 }}>{n.text}</p>
                          <p className="text-[10px] font-mono mt-0.5" style={{ color: C.ink100 }}>{n.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[12px]" style={{ color: C.ink300 }}>No notifications yet — your assessments and practice sessions will appear here.</p>
                )}
              </div>
            </>
          )}
        </div>
        {/* User profile */}
        <button onClick={onProfile} className="flex items-center gap-2.5 pl-1 text-left" title="My profile">
          <Avatar name={user.name} size={36} />
          <div className="hidden sm:block">
            <p className="text-[13px] font-semibold leading-tight font-display" style={{ color: C.ink900 }}>{user.name}</p>
            <p className="text-[11px]" style={{ color: C.ink300 }}>{cls?.label ?? "Class 10"} · {board?.short ?? "Punjab"}</p>
          </div>
          <span style={{ color: C.ink300 }}><Icons.chevDown size={14} /></span>
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GENERIC TOPBAR (non-dashboard screens)
═══════════════════════════════════════════════════════════════════════════ */
const SCREEN_META: Record<Screen, { title: string; sub: string }> = {
  dashboard:  { title: "Dashboard",        sub: "Your learning home" },
  mentor:     { title: "AI Mentor",        sub: "Your personal learning mentor" },
  assessment: { title: "Assessment",       sub: "Let's understand your level" },
  practice:   { title: "Practice",         sub: "Fresh questions for your weak topics" },
  papers:     { title: "Past Papers",      sub: "Practice with previous board exams" },
  resources:  { title: "Study Resources",  sub: "Notes & materials by topic" },
  mistake:    { title: "Mistake Analyzer", sub: "Learn from every error" },
  progress:   { title: "My Progress",      sub: "Track your growth" },
  profile:    { title: "My Profile",       sub: "Your account & learning data" },
  pro:        { title: "Upgrade to Pro",    sub: "A preview of what's coming" },
};

function BoardClassChip({ selection, onClick }: { selection: Selection; onClick: () => void }) {
  const board = BOARDS.find(b => b.id === selection.board);
  const cls = CLASSES.find(c => c.id === selection.classId);
  if (!board || !cls) return null;
  return (
    <button onClick={onClick}
      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all hover:brightness-95"
      style={{ background: C.brandSoft, color: C.brand, border: `1px solid ${C.border}` }}>
      <Icons.layers size={12} />
      {board.short} · {cls.label}
      <span style={{ color: C.ink300 }}><Icons.edit size={10} /></span>
    </button>
  );
}

function TopBar({ screen, onMenuClick, selection, onChangeSelection, user, onProfile }: {
  screen: Screen; onMenuClick: () => void; selection: Selection; onChangeSelection: () => void;
  user: StudentUser; onProfile: () => void;
}) {
  const { title, sub } = SCREEN_META[screen];
  return (
    <header className="flex-shrink-0 flex items-center gap-4 px-6 py-4 bg-white"
      style={{ borderBottom: `1px solid ${C.border}` }}>
      <button onClick={onMenuClick} className="md:hidden p-1.5 rounded-lg" style={{ color: C.ink300 }}>
        <Icons.menu size={20} />
      </button>
      <div>
        <h1 className="font-display font-bold text-[17px]" style={{ color: C.ink900 }}>{title}</h1>
        <p className="text-[12px]" style={{ color: C.ink300 }}>{sub}</p>
      </div>
      <div className="ml-auto flex items-center gap-2.5">
        <BoardClassChip selection={selection} onClick={onChangeSelection} />
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold"
          style={{ background: C.navy, border: `1px solid rgba(0,207,237,0.25)` }}>
          <span style={{ color: C.cyan }}><Icons.sparkle size={11} /></span>
          <span style={{ color: C.cyan }}>MENTORA AI</span>
        </div>
        <button onClick={onProfile} className="flex-shrink-0" title="My profile">
          <Avatar name={user.name} size={32} />
        </button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD — LEARNING JOURNEY STRIP
═══════════════════════════════════════════════════════════════════════════ */
function JourneyStrip({ steps }: { steps: { label: string; num: number; done: boolean }[] }) {
  const activeIdx = steps.findIndex(s => !s.done);
  return (
    <div>
      <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.12em] mb-3" style={{ color: C.ink300 }}>
        Your Learning Journey
      </p>
      <div className="flex items-center w-full">
        {steps.map((step, i) => (
          <div key={step.label} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-[12px] font-bold font-mono"
                style={{
                  background: step.done ? G.navPill : i === activeIdx ? G.brand : C.surf3,
                  color: step.done || i === activeIdx ? "#fff" : C.ink300,
                  boxShadow: i === activeIdx ? `0 0 0 4px ${C.brandSoft}` : undefined,
                }}>
                {step.done ? <Icons.check size={14} /> : step.num}
              </div>
              <span className="text-[10px] font-medium whitespace-nowrap"
                style={{ color: i === activeIdx ? C.brand : step.done ? C.ink500 : C.ink100 }}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex-1 mx-1 mb-3" style={{
                height: 2, borderRadius: 99,
                background: step.done ? `linear-gradient(90deg, ${C.cyan}, ${C.brand})` : C.surf3,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD SCREEN
═══════════════════════════════════════════════════════════════════════════ */

/* Subject icons */
function SubjectIcon({ subject, color, bg }: { subject: string; color: string; bg: string }) {
  const icons: Record<string, React.ReactNode> = {
    math:    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"><rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/><rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/></svg>,
    english: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"><path d="M3 4h10M3 8h7M3 12h9"/><text x="2" y="13" fill={color} fontSize="9" fontWeight="700" fontFamily="serif">Aa</text></svg>,
    physics: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="2.5"/><ellipse cx="8" cy="8" rx="7" ry="3"/><ellipse cx="8" cy="8" rx="7" ry="3" style={{transform:"rotate(60deg)",transformOrigin:"8px 8px"}}/><ellipse cx="8" cy="8" rx="7" ry="3" style={{transform:"rotate(-60deg)",transformOrigin:"8px 8px"}}/></svg>,
    urdu:    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"><path d="M2 3h12M2 7h8M2 11h10"/><rect x="10" y="9" width="4" height="5" rx="1" fill={bg} stroke={color}/></svg>,
    chemistry: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 1.5h4"/><path d="M7 1.5v4L2.5 13a1.2 1.2 0 0 0 1 1.8h9a1.2 1.2 0 0 0 1-1.8L9 5.5v-4"/><circle cx="5.5" cy="11" r="0.6" fill={color}/><circle cx="8.5" cy="9.5" r="0.6" fill={color}/><circle cx="10" cy="12" r="0.6" fill={color}/></svg>,
    biology: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="2" fill={color}/><path d="M8 2v2M8 12v2M2 8h2M12 8h2"/></svg>,
    computer: <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1.5" y="2.5" width="13" height="8.5" rx="1"/><path d="M5.5 14.5h5M8 11v3.5"/><path d="M4.5 6.5l1.5 1.5-1.5 1.5M9 9.5h2"/></svg>,
  };
  return (
    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
      style={{ background: bg }}>
      {icons[subject]}
    </div>
  );
}

/* Activity icon */
function ActivityIcon({ type }: { type: "check" | "chat" | "assessment" }) {
  const cfg = {
    check:      { bg: C.emeraldSoft, color: C.emerald, icon: <Icons.check size={13} /> },
    chat:       { bg: C.purpleSoft,  color: C.purple,  icon: <Icons.bot   size={13} /> },
    assessment: { bg: C.amberSoft,   color: C.amber,   icon: <Icons.clipboard size={13} /> },
  }[type];
  return (
    <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center"
      style={{ background: cfg.bg, color: cfg.color }}>
      {cfg.icon}
    </div>
  );
}

const SUBJECT_STYLE: Record<SubjectId, { grad: string; iconColor: string; iconBg: string }> = {
  math:      { grad: G.mathBar, iconColor: C.brand,  iconBg: C.brandSoft  },
  english:   { grad: G.englBar, iconColor: C.teal,   iconBg: C.tealSoft   },
  physics:   { grad: G.physBar, iconColor: C.purple, iconBg: C.purpleSoft },
  urdu:      { grad: G.urduBar, iconColor: C.orange, iconBg: C.orangeSoft },
  chemistry: { grad: G.chemBar, iconColor: C.rose,   iconBg: C.roseSoft   },
  biology:   { grad: G.bioBar,  iconColor: C.emerald,iconBg: C.emeraldSoft},
  computer:  { grad: G.compBar, iconColor: C.violet, iconBg: C.purpleSoft },
};
/* ── Dashboard live-data helpers — every dashboard number comes from the
   logged-in student's saved results (test + practice), never hardcoded. ── */
const DAILY_GOAL = 5; /* questions per day for Today's Goal */

function dayKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/* Consecutive days (ending today or yesterday) with at least one result. */
function computeStreak(results: AssessmentResult[]): number {
  if (results.length === 0) return 0;
  const days = new Set(results.map(r => dayKey(r.takenAt)));
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1); /* streak can still be alive from yesterday */
    if (!days.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function DashboardScreen({ onNav, onPractice, selection, userName, userId }: { onNav: (s: Screen) => void; onPractice: (subject: SubjectId, topic: string) => void; selection: Selection; userName: string; userId: string | null }) {
  const firstName = userName.trim().split(/\s+/)[0] || "Student";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const selectedSubjects = selection.subjects.length ? selection.subjects : DEFAULT_SELECTION.subjects;
  const board = BOARDS.find(b => b.id === selection.board);
  const cls = CLASSES.find(c => c.id === selection.classId);

  /* Everything below is computed from the student's real saved results. */
  const results = loadAssessmentResults(userId);
  const chronological = [...results].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
  const newestFirst = [...results].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime());
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);
  const totalCorrect = results.reduce((s, r) => s + r.correctCount, 0);
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
  const testCount = results.filter(r => r.mode === "test").length;
  const practiceCount = results.filter(r => r.mode === "practice").length;
  const totalWrong = results.reduce((s, r) => s + r.wrongCount, 0);

  /* Per-subject accuracy for the Learning Progress card. */
  const bySubject = new Map<SubjectId, { q: number; c: number }>();
  for (const r of results) {
    const cur = bySubject.get(r.subject) ?? { q: 0, c: 0 };
    cur.q += r.total; cur.c += r.correctCount;
    bySubject.set(r.subject, cur);
  }
  const subjects = selectedSubjects.map(id => {
    const meta = SUBJECTS.find(s => s.id === id)!;
    const style = SUBJECT_STYLE[id];
    const v = bySubject.get(id);
    return {
      key: id, name: meta.name, grad: style.grad, iconColor: style.iconColor, iconBg: style.iconBg,
      pct: v && v.q > 0 ? Math.round((v.c / v.q) * 100) : 0,
      sub: v && v.q > 0 ? `${v.q} question${v.q === 1 ? "" : "s"} answered` : "not started yet",
    };
  });

  /* Recent activity feed from the newest results. */
  const activityFeed = newestFirst.slice(0, 3).map(r => ({
    type: r.mode === "practice" ? ("check" as const) : ("assessment" as const),
    text: r.mode === "practice"
      ? `Practised ${r.topic === "all" ? SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject : r.topic} — ${r.correctCount}/${r.total} correct`
      : `Assessment: ${SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject} · ${r.topic === "all" ? "All topics" : r.topic} — ${r.percentage}%`,
    time: timeAgo(r.takenAt),
  }));

  /* Today's goal, streak and last-7-days sparkline data. */
  const todayCount = results
    .filter(r => dayKey(r.takenAt) === dayKey(new Date()))
    .reduce((s, r) => s + r.total, 0);
  const goalDone = Math.min(DAILY_GOAL, todayCount);
  const streak = computeStreak(results);
  const last7Days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - (6 - i)); return d; });
  const dailyQuestions = last7Days.map(d => results.filter(r => dayKey(r.takenAt) === dayKey(d)).reduce((s, r) => s + r.total, 0));
  const weekQuestions = dailyQuestions.reduce((s, n) => s + n, 0);
  const accuracyTrend = chronological.slice(-7).map(r => r.percentage);

  /* Weakest topic (with 2+ attempts) drives the recommendation & next topic. */
  const weakest = getTopicStats(results).find(t => t.attempts >= 2) ?? null;

  /* Learning-journey milestones from real activity. */
  const improved = chronological.length >= 2 && chronological[chronological.length - 1].percentage > chronological[0].percentage;
  const journeySteps = [
    { label: "Assess",   num: 1, done: testCount > 0 },
    { label: "Teach",    num: 2, done: results.length > 0 },
    { label: "Practice", num: 3, done: practiceCount > 0 },
    { label: "Analyze",  num: 4, done: totalWrong > 0 },
    { label: "Adapt",    num: 5, done: improved },
  ];

  const statCards = [
    { val: String(weekQuestions), label: "Questions Done",  sub: "This Week",                         color: C.teal,   data: dailyQuestions.some(n => n > 0) ? dailyQuestions : [0,0,0,0,0,0,0] },
    { val: totalQuestions > 0 ? `${accuracy}%` : "—", label: "Accuracy Rate", sub: `across ${totalQuestions} question${totalQuestions === 1 ? "" : "s"}`, color: C.purple, data: accuracyTrend.length >= 2 ? accuracyTrend : [0,0] },
    { val: `${streak}d`, label: "Learning Streak", sub: streak > 0 ? "Keep it up!" : "Start today", color: C.orange, data: dailyQuestions.some(n => n > 0) ? dailyQuestions.map(n => (n > 0 ? 1 : 0)) : [0,0,0,0,0,0,0] },
  ];

  return (
    <div className="space-y-0">
      {/* Greeting */}
      <div className="mb-4">
        <h2 className="font-display text-[26px] font-bold leading-tight"
          style={{ background: G.violet, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
          {greeting}, {firstName} 👋
        </h2>
        <p className="text-[13px] mt-0.5" style={{ color: C.ink300 }}>
          {board && cls ? `${cls.label} · ${board.name} — ready to continue your learning journey?` : "Ready to continue your learning journey?"}
        </p>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">

        {/* ── LEFT COLUMN ── */}
        <div className="space-y-4">

          {/* Hero card */}
          <div className="relative overflow-hidden rounded-2xl p-6 min-h-[220px]"
            style={{ background: G.hero }}>
            <MoonIllustration />
            {/* Stars */}
            {[[15,25],[25,15],[40,8],[80,30],[50,20]].map(([x,y],i)=>(
              <div key={i} className="absolute w-1 h-1 rounded-full bg-white opacity-50"
                style={{ left: `${x}%`, top: `${y}%` }} />
            ))}
            {/* Horizon glow */}
            <div className="absolute bottom-0 left-0 right-0 h-24 pointer-events-none"
              style={{ background: "linear-gradient(0deg, rgba(91,95,239,0.25) 0%, transparent 100%)" }} />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2 h-2 rounded-full" style={{ background: C.emerald, boxShadow: `0 0 6px ${C.emerald}` }} />
                <span className="text-[11px] font-mono font-semibold" style={{ color: C.emerald }}>AI MENTOR • ACTIVE</span>
              </div>
              <h3 className="font-display font-bold text-[22px] text-white leading-snug mb-2">
                Ready to continue your<br/>learning journey?
              </h3>
              <p className="text-[13px] mb-5" style={{ color: "rgba(255,255,255,0.55)" }}>
                {totalQuestions === 0
                  ? "Take your first assessment to unlock your personalised learning plan."
                  : goalDone >= DAILY_GOAL
                    ? "Daily goal complete — brilliant work today! 🎉"
                    : `${DAILY_GOAL - goalDone} question${DAILY_GOAL - goalDone === 1 ? "" : "s"} left to hit today's goal.`}
              </p>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => onNav("mentor")}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[.97]"
                  style={{ background: G.brand }}>
                  Chat with Mentora AI
                </button>
                <button onClick={() => onNav("practice")}
                  className="px-5 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:bg-opacity-20 active:scale-[.97]"
                  style={{ background: "rgba(255,255,255,0.10)", color: "white", border: "1.5px solid rgba(255,255,255,0.25)" }}>
                  Continue Practice →
                </button>
              </div>
            </div>
          </div>

          {/* Learning Progress */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Learning Progress</h3>
              <button className="flex items-center gap-1 text-[12px] font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-gray-50"
                style={{ color: C.ink300, border: `1px solid ${C.border}` }}>
                This Week <Icons.chevDown size={13} />
              </button>
            </div>
            <div className="space-y-4">
              {subjects.map(s => (
                <div key={s.key} className="flex items-center gap-3">
                  <SubjectIcon subject={s.key} color={s.iconColor} bg={s.iconBg} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <div>
                        <span className="text-[13px] font-semibold" style={{ color: C.ink700 }}>{s.name}</span>
                        <span className="text-[12px] ml-1.5" style={{ color: C.ink300 }}>— {s.sub}</span>
                      </div>
                      <span className="text-[12px] font-semibold font-mono ml-3" style={{ color: C.ink500 }}>{s.pct}%</span>
                    </div>
                    <Bar pct={s.pct} grad={s.grad} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-5">
            <h3 className="font-display font-bold text-[15px] mb-4" style={{ color: C.ink900 }}>Recent Activity</h3>
            <div className="space-y-3">
              {activityFeed.length > 0 ? activityFeed.map((a, i) => (
                <div key={i} className="flex items-center gap-3">
                  <ActivityIcon type={a.type} />
                  <p className="flex-1 text-[13px]" style={{ color: C.ink700 }}>{a.text}</p>
                  <span className="text-[11px] font-mono flex-shrink-0" style={{ color: C.ink100 }}>{a.time}</span>
                </div>
              )) : (
                <p className="text-[13px]" style={{ color: C.ink300 }}>No activity yet — take an assessment to get started.</p>
              )}
            </div>
            <button className="mt-4 w-full py-2.5 text-[13px] font-semibold rounded-xl transition-colors hover:bg-indigo-50"
              style={{ color: C.brand, border: `1px solid ${C.border}` }}>
              View All Activity
            </button>
          </Card>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="space-y-4">

          {/* Mentora AI banner */}
          <div className="relative overflow-hidden rounded-2xl p-5 flex items-center justify-between"
            style={{ background: G.banner, minHeight: 90 }}>
            <div className="relative z-10">
              <p className="font-display font-bold text-[18px] text-white leading-tight">Mentora AI</p>
              <p className="text-[12px] mt-0.5" style={{ color: "rgba(255,255,255,0.65)" }}>Always here to guide you</p>
            </div>
            <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 pointer-events-none">
              <RobotIllustration />
            </div>
            {/* Decorative orb */}
            <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full pointer-events-none"
              style={{ background: "rgba(255,255,255,0.10)" }} />
          </div>

          {/* Learning Journey */}
          <Card className="p-5">
            <JourneyStrip steps={journeySteps} />
          </Card>

          {/* AI Recommendation */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: G.brand }}>
                <Icons.sparkle size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-[14px] mb-1" style={{ color: C.ink900 }}>Your AI Recommendation</p>
                <p className="text-[12px] leading-relaxed" style={{ color: C.ink500 }}>
                  {weakest
                    ? `You should practise ${weakest.topic} — ${weakest.pct}% accuracy in ${weakest.subjectName} so far. A focused session will lift it fastest.`
                    : totalQuestions > 0
                      ? "Great accuracy across your practised topics — keep going to stay sharp."
                      : "Take your first assessment and I'll build a personalised practice plan for you."}
                </p>
              </div>
              <button onClick={() => weakest ? onPractice(weakest.subject, weakest.topic) : onNav("practice")}
                className="flex-shrink-0 px-3 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:brightness-110 active:scale-[.97]"
                style={{ background: G.brand }}>
                Start Practice
              </button>
            </div>
          </Card>

          {/* Stat mini-cards */}
          <div className="grid grid-cols-3 gap-2.5">
            {statCards.map(s => (
              <Card key={s.label} className="p-3">
                <p className="font-display font-bold text-[18px] leading-none mb-0.5"
                  style={{ color: s.color }}>{s.val}</p>
                <p className="text-[10px] font-semibold leading-tight" style={{ color: C.ink700 }}>{s.label}</p>
                <p className="text-[10px] mb-2" style={{ color: C.ink100 }}>{s.sub}</p>
                <Sparkline data={s.data} color={s.color} width={90} height={32} />
              </Card>
            ))}
          </div>

          {/* Today's Goal */}
          <Card className="p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>Today's Goal</p>
                <p className="text-[12px] mt-0.5" style={{ color: C.ink500 }}>Answer {DAILY_GOAL} questions today</p>
              </div>
              <span className="text-2xl">🏆</span>
            </div>
            <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: C.surf3 }}>
              <div className="h-full rounded-full" style={{ width: `${(goalDone / DAILY_GOAL) * 100}%`, background: G.brand, transition: "width 1s ease" }} />
            </div>
            <p className="text-[12px] font-semibold text-right" style={{ color: C.ink300 }}>
              <strong style={{ color: C.ink900 }}>{goalDone}</strong> / {DAILY_GOAL} completed
            </p>
          </Card>

          {/* Suggested Next Topic */}
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center"
                style={{ background: C.tealSoft, color: C.teal }}>
                <Icons.book size={15} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-mono font-semibold uppercase tracking-wide mb-0.5" style={{ color: C.ink300 }}>
                  Suggested Next Topic
                </p>
                <p className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>
                  {weakest ? weakest.topic : TOPICS_BY_SUBJECT[selectedSubjects[0] ?? "math"][0]}
                </p>
                <p className="text-[12px]" style={{ color: C.ink300 }}>{weakest ? "Your weakest topic so far" : "Start here — your first topic"}</p>
              </div>
              <button onClick={() => weakest ? onPractice(weakest.subject, weakest.topic) : onNav("practice")}
                className="flex-shrink-0 flex items-center gap-1 text-[12px] font-semibold transition-colors hover:opacity-80"
                style={{ color: C.brand }}>
                Start Learning <Icons.arrowRight size={13} />
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AI MENTOR SCREEN
═══════════════════════════════════════════════════════════════════════════ */
type ChatMsg = { role: "ai" | "user"; text: string; time: string };
type MentorStatus = "checking" | "online" | "offline" | "unconfigured";

/* A PDF the student attached — the AI proxy parses it and answers from it. */
type AttachedPdf = { docId: string; name: string; pages: number; truncated: boolean };

/* First message the student sees — personalized from their saved Board/Class/Subjects */
function welcomeMessage(userName: string, selection: Selection, firstSubjectName: string): ChatMsg {
  const firstName = userName.trim().split(/\s+/)[0] || "there";
  const board = BOARDS.find(b => b.id === selection.board);
  const cls = CLASSES.find(c => c.id === selection.classId);
  const where = board && cls ? ` (${cls.label} · ${board.short})` : "";
  return {
    role: "ai",
    time: nowTime(),
    text: `Hi ${firstName}! I'm your Mentora AI 👋\n\nAsk me anything about ${firstSubjectName}${where} — pick a Subject & Topic above so my answers match exactly what you're learning.\n\nI'll explain step by step in simple language — in English or اردو, whichever you prefer. Instead of just handing over answers, I'll help you truly understand them.\n\nSo — what shall we work on today?`,
  };
}

const CHIPS = ["Explain more simply", "Give me a hint", "Give me a practice question", "Show me step by step"];

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function ChatBubble({ msg, userName }: { msg: ChatMsg; userName: string }) {
  const isAI = msg.role === "ai";
  return (
    <div className={`flex gap-3.5 ${isAI ? "" : "flex-row-reverse"}`} style={{ animation: "fadeUp .35s ease both" }}>
      {isAI ? (
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center"
          style={{ background: G.cyan }}>
          <Icons.bot size={15} />
        </div>
      ) : (
        <Avatar name={userName} size={36} />
      )}
      <div className={`max-w-[80%] flex flex-col gap-1.5 ${isAI ? "items-start" : "items-end"}`}>
        <div className="px-5 py-4 rounded-2xl text-[15px] leading-[1.7] whitespace-pre-line"
          style={isAI
            ? { background: "#fff", border: `1px solid ${C.border}`, color: C.ink900, boxShadow: "0 1px 6px rgba(91,95,239,.06)" }
            : { background: G.brand, color: "#fff" }}>
          {msg.text}
        </div>
        <span className="text-[11px] font-mono px-1" style={{ color: C.ink100 }}>{msg.time}</span>
      </div>
    </div>
  );
}

/* ── Voice input (Web Speech API) — minimal local typings (not in lib.dom). ── */
type SRAlternative = { transcript: string };
type SRResult = { isFinal: boolean; length: number; [index: number]: SRAlternative };
type SRResultList = { length: number; [index: number]: SRResult };
type SREvent = { resultIndex: number; results: SRResultList };
type SRErrorEvent = { error: string };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  start(): void;
  stop(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

/* ── Offline voice fallback (Whisper in the browser) ─────────────────────
   When Chrome's online speech service is unreachable ("network" error),
   voice input records with MediaRecorder and transcribes locally through
   the Whisper worker — free, no API key, model cached after first use. */

/* Whisper needs 16 kHz mono audio — linear resample from the mic rate. */
function resampleTo16k(input: Float32Array, fromRate: number): Float32Array {
  if (fromRate === 16000) return input;
  const ratio = fromRate / 16000;
  const outLen = Math.floor(input.length / ratio);
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, input.length - 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

function MentorScreen({ user, selection }: { user: StudentUser; selection: Selection }) {
  /* Context the AI tailors answers to: the student's saved Board & Class plus
     the Subject & Topic picked here. */
  const availableSubjects = selection.subjects.length > 0 ? selection.subjects : SUBJECTS.map(s => s.id);
  const [subject, setSubject] = useState<SubjectId>(availableSubjects[0] ?? "math");
  const [topic, setTopic]     = useState<string>("all");
  const activeSubject = availableSubjects.includes(subject) ? subject : (availableSubjects[0] ?? "math");
  const subjectMeta   = SUBJECTS.find(s => s.id === activeSubject) ?? SUBJECTS[0];
  const topicOptions = [{ value: "all", label: "All topics" }, ...TOPICS_BY_SUBJECT[activeSubject].map(t => ({ value: t, label: t }))];
  const board = BOARDS.find(b => b.id === selection.board);
  const cls   = CLASSES.find(c => c.id === selection.classId);

  /* Live status of the AI proxy (server/server.mjs) — the API key lives there. */
  const [status, setStatus] = useState<MentorStatus>("checking");
  useEffect(() => {
    let alive = true;
    fetch("/api/ai/health")
      .then(r => r.json())
      .then((d: { configured?: boolean }) => { if (alive) setStatus(d?.configured ? "online" : "unconfigured"); })
      .catch(() => { if (alive) setStatus("offline"); });
    return () => { alive = false; };
  }, []);

  const [msgs, setMsgs]       = useState<ChatMsg[]>(() => [welcomeMessage(user.name, selection, subjectMeta.name)]);
  const [input, setInput]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<{ text: string; question: string } | null>(null);
  const bottomRef             = useRef<HTMLDivElement>(null);

  /* PDF upload — sent to /api/ai/pdf, which extracts the text server-side. */
  const [pdf, setPdf]             = useState<AttachedPdf | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRef                   = useRef<HTMLInputElement>(null);

  /* Voice input — the browser's built-in speech recognition (Web Speech API)
     turns speech into text client-side. No server or API-key changes needed. */
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recogRef        = useRef<SpeechRecognitionLike | null>(null);
  const listeningRef    = useRef(false);
  const noAutoSendRef   = useRef(false);
  const manualStopRef   = useRef(false);
  const voiceBusyRef    = useRef(false);
  const baseInputRef    = useRef("");
  const finalVoiceRef   = useRef("");
  const interimVoiceRef = useRef("");
  const sendRef         = useRef(send);
  sendRef.current = send;

  /* Offline Whisper fallback: recording / engine load / transcription. */
  const [recording, setRecording] = useState(false);
  const [engineStatus, setEngineStatus] = useState<{ phase: "loading" | "transcribing"; pct?: number } | null>(null);
  const recorderRef     = useRef<MediaRecorder | null>(null);
  const recStreamRef    = useRef<MediaStream | null>(null);
  const recChunksRef    = useRef<Blob[]>([]);
  const recTimerRef     = useRef<number | null>(null);
  const workerRef       = useRef<Worker | null>(null);
  const discardVoiceRef = useRef(false);
  const localActiveRef  = useRef(false);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading, error]);

  /* Ask the proxy (which holds the key) — sends Board/Class/Subject/Topic so
     answers match exactly what the student is learning. */
  async function ask(question: string, history: ChatMsg[]) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          boardName:   board?.name   ?? "",
          classLabel:  cls?.label    ?? "",
          subjectName: subjectMeta.name,
          topic:       topic === "all" ? "" : topic,
          docId:       pdf?.docId ?? "",
          history: history.slice(-10).map(m => ({ role: m.role === "ai" ? "assistant" : "user", content: m.text })),
        }),
      });
      const data = (await res.json().catch(() => null)) as { answer?: string; error?: string } | null;
      const answer = data?.answer;
      if (!res.ok || !answer) {
        if (!data) setStatus("offline");
        throw new Error(data?.error
          || (res.status === 429 ? "Too many requests — please wait a moment and try again."
          : (res.status >= 500 ? "Can't reach the AI server — start it with: npm run server"
          : "Something went wrong. Please try again.")));
      }
      setStatus("online");
      setMsgs(p => [...p, { role: "ai", text: answer, time: nowTime() }]);
    } catch (e) {
      setError({ text: e instanceof Error ? e.message : "Something went wrong. Please try again.", question });
    } finally {
      setLoading(false);
    }
  }

  function send(text: string, fromVoice = false) {
    const t = text.trim();
    if (!t || loading) return;
    /* Sending while voice is capturing: stop recognition quietly so its
       auto-send can't duplicate what is being sent now. Voice-originated
       sends skip this — they are the auto-send. */
    if (!fromVoice) {
      if (listeningRef.current) {
        noAutoSendRef.current = true;
        const r = recogRef.current;
        if (r) { r.onresult = null; r.onerror = null; r.stop(); }
      }
      discardVoiceRef.current = true; /* cancels any pending offline transcription */
      stopLocalVoice();
    }
    const history = msgs.slice(-10);
    setMsgs(p => [...p, { role: "user", text: t, time: nowTime() }]);
    setInput("");
    void ask(t, history);
  }

  /* Re-ask the failed question (its user bubble is already in the chat). */
  function retry() {
    if (!error || loading) return;
    const last = msgs[msgs.length - 1];
    const history = last && last.role === "user" && last.text === error.question
      ? msgs.slice(0, -1).slice(-10)
      : msgs.slice(-10);
    void ask(error.question, history);
  }

  /* Upload the picked PDF, then let the AI answer questions from it. */
  async function uploadPdf(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      const res = await fetch("/api/ai/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/pdf", "X-File-Name": encodeURIComponent(file.name) },
        body: file,
      });
      const data = (await res.json().catch(() => null)) as {
        docId?: string; name?: string; pages?: number; truncated?: boolean; error?: string;
      } | null;
      if (!res.ok || !data?.docId) {
        throw new Error(data?.error
          || (res.status >= 500 ? "Can't reach the AI server — start it in a terminal with: npm run server"
          : "Couldn't read that PDF. Please try again."));
      }
      const doc: AttachedPdf = {
        docId: data.docId, name: data.name || file.name,
        pages: data.pages ?? 0, truncated: !!data.truncated,
      };
      setPdf(doc);
      setMsgs(p => [...p, {
        role: "ai", time: nowTime(),
        text: `I've read your PDF "${doc.name}" (${doc.pages} page${doc.pages === 1 ? "" : "s"})${doc.truncated ? " — it's a long one, so I've read the first part" : ""}.\n\nAsk me anything about it — I'll answer from your document. 📄`,
      }]);
    } catch (e) {
      const msg = e instanceof TypeError
        ? "Can't reach the AI server — start it in a terminal with: npm run server"
        : e instanceof Error ? e.message : "Couldn't upload that PDF. Please try again.";
      setUploadError(msg);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = ""; /* allow picking the same file again */
    }
  }

  function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== "application/pdf" && !f.name.toLowerCase().endsWith(".pdf")) {
      setUploadError("Please choose a PDF file (.pdf).");
      e.target.value = "";
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      setUploadError("That PDF is too large — please keep it under 15 MB.");
      e.target.value = "";
      return;
    }
    void uploadPdf(f);
  }

  /* Tap-to-talk: starts/stops browser speech recognition. Microphone access
     is requested up front (getUserMedia) so the permission prompt reliably
     appears on the click and recognition can actually capture speech. Spoken
     words fill the input live and the question is sent once captured. */
  async function toggleVoice() {
    if (voiceBusyRef.current) return;
    setVoiceError(null);
    if (listeningRef.current) {
      manualStopRef.current = true; /* tapping stop keeps the text in the input, never auto-sends */
      recogRef.current?.stop();
      return;
    }
    if (recording) {
      /* Offline recording in progress: tapping the mic stops it — the question
         is sent automatically once Whisper has transcribed it. */
      stopLocalVoice();
      return;
    }
    const w = window as unknown as SpeechWindow;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      setVoiceError("Voice input isn't supported in this browser — try Chrome or Edge.");
      return;
    }
    voiceBusyRef.current = true;
    try {
      /* Ask for the microphone first — a denied/blocked mic here is the usual
         reason recognition "doesn't capture anything" in real browsers. */
      if (navigator.mediaDevices?.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          stream.getTracks().forEach(t => t.stop()); /* only needed for the permission */
        } catch (err) {
          const name = err instanceof DOMException ? err.name : "";
          if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError")
            setVoiceError("Microphone access was blocked — allow it in your browser settings and try again.");
          else if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError")
            setVoiceError("No microphone was found — connect one and try again.");
          else
            setVoiceError("Couldn't access the microphone — please check your device and try again.");
          return;
        }
      }
      const recog = new SR();
      recogRef.current = recog;
      /* Urdu questions get Urdu speech recognition; everything else listens in English. */
      recog.lang = activeSubject === "urdu" ? "ur-PK" : "en-US";
      recog.continuous = false;
      recog.interimResults = true;
      baseInputRef.current = input;
      finalVoiceRef.current = "";
      interimVoiceRef.current = "";
      noAutoSendRef.current = false;
      manualStopRef.current = false;
      recog.onresult = (e) => {
        let finalText = "", interimText = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript; else interimText += r[0].transcript;
        }
        finalVoiceRef.current = finalText.trim();
        interimVoiceRef.current = interimText.trim();
        const spoken = `${finalText} ${interimText}`.replace(/\s+/g, " ").trim();
        setInput(`${baseInputRef.current ? `${baseInputRef.current} ` : ""}${spoken}`);
      };
      recog.onend = () => {
        listeningRef.current = false;
        setListening(false);
        if (noAutoSendRef.current || manualStopRef.current) return;
        /* Auto-send what was captured — final text, or interim if the browser
           ended without finalizing (some voices/languages never produce final). */
        const captured = (finalVoiceRef.current || interimVoiceRef.current).trim();
        if (!captured) return;
        const q = `${baseInputRef.current ? `${baseInputRef.current} ` : ""}${captured}`.replace(/\s+/g, " ").trim();
        if (q) sendRef.current(q, true);
      };
      recog.onerror = (e) => {
        if (e.error === "aborted") return; /* manual stop — not an error */
        /* Chrome's online speech service is unreachable — fully offline, or the
           service is blocked/absent while the web still works. Switch to the
           offline engine automatically so voice input keeps working either way. */
        if (e.error === "network" || e.error === "service-not-allowed") {
          noAutoSendRef.current = true; /* its onend must not double-send partial text */
          void startLocalVoice();
          return;
        }
        if (e.error === "not-allowed")
          setVoiceError("Microphone access was blocked — allow it in your browser settings and try again.");
        else if (e.error === "no-speech")
          setVoiceError("I didn't hear anything — tap the mic and speak again.");
        else if (e.error === "audio-capture")
          setVoiceError("No microphone was found — connect one and try again.");
      };
      recog.start();
      listeningRef.current = true;
      setListening(true);
    } catch {
      listeningRef.current = false;
      setListening(false);
      setVoiceError("Couldn't start voice input — tap the mic and try again.");
    } finally {
      voiceBusyRef.current = false;
    }
  }

  /* ── Offline fallback (Whisper in-browser): record the mic, transcribe locally. ── */

  /* The Whisper worker is created on first use and kept for the session — the
     model files stay cached in the browser after the one-time download. */
  function ensureVoiceWorker(): Worker {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker(new URL("./voice-worker.ts", import.meta.url), { type: "module" });
    worker.onmessage = (e: MessageEvent) => {
      const d = e.data as { type?: string; pct?: number; text?: string; message?: string };
      if (d.type === "loading")
        setEngineStatus({ phase: "loading", pct: d.pct ?? 0 });
      else if (d.type === "transcribing")
        setEngineStatus({ phase: "transcribing" });
      else if (d.type === "result") {
        setEngineStatus(null);
        if (discardVoiceRef.current) return;
        const spoken = (d.text ?? "").trim();
        if (!spoken) {
          setVoiceError("I didn't hear anything — tap the mic and speak again.");
          return;
        }
        const q = `${baseInputRef.current ? `${baseInputRef.current} ` : ""}${spoken}`.replace(/\s+/g, " ").trim();
        if (q) sendRef.current(q, true);
      } else if (d.type === "error") {
        setEngineStatus(null);
        if (!discardVoiceRef.current)
          setVoiceError(`Offline voice recognition failed — ${d.message ?? "please try again."}`);
      }
    };
    workerRef.current = worker;
    return worker;
  }

  /* Record the microphone; the captured audio is decoded and transcribed on stop. */
  async function startLocalVoice() {
    if (localActiveRef.current) return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setVoiceError("Offline voice input isn't supported in this browser — try Chrome or Edge.");
      return;
    }
    voiceBusyRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localActiveRef.current = true;
      recStreamRef.current = stream;
      recChunksRef.current = [];
      discardVoiceRef.current = false;
      baseInputRef.current = input;
      const rec = new MediaRecorder(stream);
      recorderRef.current = rec;
      rec.ondataavailable = (ev) => { if (ev.data.size > 0) recChunksRef.current.push(ev.data); };
      rec.onerror = () => {
        setVoiceError("Recording stopped unexpectedly — tap the mic and try again.");
        discardVoiceRef.current = true;
        stopLocalVoice();
      };
      rec.onstop = () => { void finalizeLocalVoice(rec); };
      rec.start();
      setRecording(true);
      /* Safety cap — Whisper's listening window is ~30 s. */
      recTimerRef.current = window.setTimeout(() => stopLocalVoice(), 30000);
    } catch (err) {
      localActiveRef.current = false;
      const name = err instanceof DOMException ? err.name : "";
      if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError")
        setVoiceError("Microphone access was blocked — allow it in your browser settings and try again.");
      else if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError")
        setVoiceError("No microphone was found — connect one and try again.");
      else
        setVoiceError("Couldn't access the microphone — please check your device and try again.");
    } finally {
      voiceBusyRef.current = false;
    }
  }

  /* Stop the offline recording (mic tap or safety timer). The transcribed
     question is sent automatically once Whisper finishes. */
  function stopLocalVoice() {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") rec.stop();
    if (recTimerRef.current !== null) { window.clearTimeout(recTimerRef.current); recTimerRef.current = null; }
    setRecording(false);
  }

  /* Recorder stopped: decode the audio, mix to mono, resample to 16 kHz and
     hand it to the Whisper worker. */
  async function finalizeLocalVoice(rec: MediaRecorder) {
    if (recTimerRef.current !== null) { window.clearTimeout(recTimerRef.current); recTimerRef.current = null; }
    recStreamRef.current?.getTracks().forEach(t => t.stop());
    recStreamRef.current = null;
    recorderRef.current = null;
    localActiveRef.current = false;
    setRecording(false);
    const blob = new Blob(recChunksRef.current, { type: rec.mimeType || "audio/webm" });
    recChunksRef.current = [];
    if (discardVoiceRef.current || blob.size === 0) return;
    try {
      setEngineStatus({ phase: "transcribing" });
      const actx = new AudioContext();
      try {
        const decoded = await actx.decodeAudioData(await blob.arrayBuffer());
        /* Whisper expects 16 kHz mono — mix channels down, then resample. */
        let mono = decoded.getChannelData(0);
        if (decoded.numberOfChannels > 1) {
          const mixed = new Float32Array(decoded.length);
          for (let c = 0; c < decoded.numberOfChannels; c++) {
            const data = decoded.getChannelData(c);
            for (let i = 0; i < decoded.length; i++) mixed[i] += data[i] / decoded.numberOfChannels;
          }
          mono = mixed;
        }
        const pcm = resampleTo16k(mono, decoded.sampleRate);
        ensureVoiceWorker().postMessage({ type: "transcribe", audio: pcm, language: activeSubject === "urdu" ? "ur" : "en" });
      } finally {
        void actx.close();
      }
    } catch {
      setEngineStatus(null);
      setVoiceError("Couldn't process the recording — tap the mic and try again.");
    }
  }

  /* Stop any active recognition/recording when leaving the chat (no auto-send then). */
  useEffect(() => () => {
    const r = recogRef.current;
    if (r) { r.onresult = null; r.onerror = null; r.onend = null; r.stop(); }
    discardVoiceRef.current = true;
    stopLocalVoice();
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  const STATUS_META: Record<MentorStatus, { color: string; label: string; title?: string }> = {
    checking:     { color: C.ink300, label: "Connecting…" },
    online:       { color: C.emerald, label: "Online" },
    unconfigured: { color: C.amber, label: "Needs setup", title: "Add AI_API_KEY to mentora/.env (see .env.example), then restart the server: npm run server" },
    offline:      { color: C.rose, label: "Offline", title: "Start the AI server in a terminal: npm run server" },
  };
  const sm = STATUS_META[status];

  return (
    <div className="flex flex-col h-full -m-6">
      <div className="flex items-center gap-3 px-5 py-3.5 flex-shrink-0 bg-white" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}>
          <Icons.bot size={16} />
        </div>
        <div>
          <p className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>Mentora AI</p>
          <p className="text-[11px]" style={{ color: C.ink300 }}>Your personal learning mentor</p>
        </div>
        <div className="ml-auto flex items-center gap-2" title={sm.title}>
          <span className="w-2 h-2 rounded-full" style={{ background: sm.color, boxShadow: sm.color === C.emerald ? `0 0 6px ${C.emerald}` : undefined }} />
          <span className="text-[11px] font-semibold" style={{ color: sm.color }}>{sm.label}</span>
        </div>
      </div>
      <div className="flex items-center gap-2.5 flex-wrap px-5 py-2.5 flex-shrink-0 bg-white" style={{ borderBottom: `1px solid ${C.border}` }}>
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wide flex-shrink-0" style={{ color: C.ink300 }}>Asking about</span>
        <select value={activeSubject} onChange={e => { setSubject(e.target.value as SubjectId); setTopic("all"); }}
          className="px-2.5 py-1.5 rounded-xl text-[12px] font-medium outline-none appearance-none cursor-pointer"
          style={{ background: C.surf1, border: `1.5px solid ${C.border}`, color: C.ink700 }}>
          {SUBJECTS.filter(s => availableSubjects.includes(s.id)).map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <select value={topic} onChange={e => setTopic(e.target.value)}
          className="px-2.5 py-1.5 rounded-xl text-[12px] font-medium outline-none appearance-none cursor-pointer max-w-[220px]"
          style={{ background: C.surf1, border: `1.5px solid ${C.border}`, color: C.ink700 }}>
          {topicOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="ml-auto text-[11px] font-medium px-2.5 py-1 rounded-lg" style={{ background: C.surf1, color: C.ink500 }}>
          {board ? board.short : "No board"} · {cls ? cls.label : "No class"}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-3 space-y-3.5" style={{ background: C.surf1 }}>
        {msgs.map((m, i) => <ChatBubble key={i} msg={m} userName={user.name} />)}
        {error && (
          <div className="flex gap-3" style={{ animation: "fadeUp .35s ease both" }}>
            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: C.roseSoft, color: C.rose }}>
              <Icons.alert size={14} />
            </div>
            <div className="max-w-[75%] px-4 py-3 rounded-2xl" style={{ background: C.roseSoft }}>
              <p className="text-[12px] font-medium leading-relaxed" style={{ color: C.rose }}>{error.text}</p>
              <button onClick={retry} disabled={loading}
                className="mt-1.5 text-[12px] font-bold transition-opacity hover:opacity-75 disabled:opacity-50" style={{ color: C.rose }}>
                Try again
              </button>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.bot size={14} /></div>
            <div className="px-4 py-3.5 rounded-2xl flex gap-2 items-center" style={{ background: "#fff", border: `1px solid ${C.border}` }}>
              {[0,1,2].map(i => <span key={i} className="w-2 h-2 rounded-full" style={{ background: C.ink300, animation: `dotBlink 1.4s ${i*0.16}s ease-in-out infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {!msgs.some(m => m.role === "user") && (
        <div className="px-5 pt-1.5 pb-1 flex gap-1.5 flex-wrap flex-shrink-0 bg-white" style={{ borderTop: `1px solid ${C.border}` }}>
          {CHIPS.map(c => (
            <button key={c} onClick={() => send(c)} disabled={loading}
              className="text-[10px] font-medium px-2 py-[3px] rounded-lg border transition-all hover:border-indigo-400 hover:text-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ borderColor: C.border, color: C.ink300, background: C.surf1 }}>{c}</button>
          ))}
        </div>
      )}
      {/* Status rows: voice listening + offline recording + PDF upload states + voice errors */}
      {(listening || recording || engineStatus || uploading || pdf || uploadError || voiceError) && (
        <div className="px-5 py-1.5 flex-shrink-0 bg-white">
          {listening && (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl" style={{ background: C.roseSoft }}>
              <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: C.rose }} />
              <span className="text-[12px] font-medium" style={{ color: C.rose }}>Listening… speak now</span>
              <button onClick={() => { manualStopRef.current = true; recogRef.current?.stop(); }}
                className="flex-shrink-0 ml-auto p-1 rounded-lg transition-colors hover:bg-white/60" style={{ color: C.rose }}
                title="Stop voice input">
                <Icons.x size={12} />
              </button>
            </div>
          )}
          {recording && (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl" style={{ background: C.roseSoft }}>
              <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: C.rose }} />
              <span className="text-[12px] font-medium" style={{ color: C.rose }}>Listening… speak now, tap the mic to send</span>
              <button onClick={() => { discardVoiceRef.current = true; stopLocalVoice(); }}
                className="flex-shrink-0 ml-auto p-1 rounded-lg transition-colors hover:bg-white/60" style={{ color: C.rose }}
                title="Cancel voice input">
                <Icons.x size={12} />
              </button>
            </div>
          )}
          {engineStatus && (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl" style={{ background: C.surf1, border: `1px solid ${C.border}` }}>
              <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin flex-shrink-0" style={{ borderColor: C.brand, borderTopColor: "transparent" }} />
              <span className="text-[12px] font-medium" style={{ color: C.ink500 }}>
                {engineStatus.phase === "loading"
                  ? `Loading offline speech engine… ${engineStatus.pct ?? 0}% (one-time download)`
                  : "Transcribing your speech…"}
              </span>
            </div>
          )}
          {uploading && (
            <div className="inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl" style={{ background: C.surf1, border: `1px solid ${C.border}` }}>
              <span className="w-3.5 h-3.5 rounded-full border-2 animate-spin" style={{ borderColor: C.brand, borderTopColor: "transparent" }} />
              <span className="text-[12px] font-medium" style={{ color: C.ink500 }}>Reading your PDF…</span>
            </div>
          )}
          {!uploading && pdf && (
            <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl max-w-full" style={{ background: C.brandSoft, border: `1px solid ${C.border}` }}>
              <span className="flex-shrink-0" style={{ color: C.brand }}><Icons.fileText size={14} /></span>
              <span className="text-[12px] font-semibold truncate" style={{ color: C.ink700 }}>{pdf.name}</span>
              <span className="flex-shrink-0 text-[11px]" style={{ color: C.ink300 }}>
                {pdf.pages} page{pdf.pages === 1 ? "" : "s"}{pdf.truncated ? " · first part" : ""}
              </span>
              <button onClick={() => setPdf(null)}
                className="flex-shrink-0 p-1 rounded-lg transition-colors hover:bg-white" style={{ color: C.ink300 }}
                title="Remove PDF">
                <Icons.x size={12} />
              </button>
            </div>
          )}
          {!uploading && !pdf && uploadError && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: C.roseSoft }}>
              <span className="flex-shrink-0 mt-0.5" style={{ color: C.rose }}><Icons.alert size={13} /></span>
              <p className="text-[12px] leading-relaxed" style={{ color: C.rose }}>{uploadError}</p>
              <button onClick={() => setUploadError(null)}
                className="flex-shrink-0 ml-auto p-1 rounded-lg transition-colors hover:bg-white/60" style={{ color: C.rose }}
                title="Dismiss">
                <Icons.x size={12} />
              </button>
            </div>
          )}
          {!uploading && !pdf && !uploadError && voiceError && (
            <div className="inline-flex items-start gap-2 px-3.5 py-2 rounded-xl" style={{ background: C.roseSoft }}>
              <span className="flex-shrink-0 mt-0.5" style={{ color: C.rose }}><Icons.mic size={13} /></span>
              <p className="text-[12px] leading-relaxed" style={{ color: C.rose }}>{voiceError}</p>
              <button onClick={() => setVoiceError(null)}
                className="flex-shrink-0 ml-auto p-1 rounded-lg transition-colors hover:bg-white/60" style={{ color: C.rose }}
                title="Dismiss">
                <Icons.x size={12} />
              </button>
            </div>
          )}
        </div>
      )}
      {(status === "unconfigured" || status === "offline") && (
        <div className="px-4 pt-2 flex-shrink-0 bg-white">
          <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl"
            style={{ background: status === "unconfigured" ? C.amberSoft : C.roseSoft }}>
            <span className="flex-shrink-0 mt-0.5" style={{ color: status === "unconfigured" ? C.amber : C.rose }}><Icons.alert size={14} /></span>
            <p className="text-[12px] leading-relaxed" style={{ color: status === "unconfigured" ? C.orange : C.rose }}>
              {status === "unconfigured"
                ? "Mentora AI isn't configured yet — add AI_API_KEY to mentora/.env (see .env.example), then restart the server: npm run server."
                : "Can't reach the AI server — start it in a terminal with: npm run server."}
            </p>
          </div>
        </div>
      )}
      <div className="px-4 pb-3 pt-1.5 flex-shrink-0 bg-white">
        <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-2xl" style={{ background: C.surf1, border: `1.5px solid ${C.border}` }}>
          <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={onPickFile} />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="p-1.5 flex-shrink-0 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40"
            style={{ color: pdf ? C.brand : C.ink300 }} title="Attach a PDF (I'll answer from it)">
            <Icons.clip size={15} />
          </button>
          <button onClick={toggleVoice} disabled={!!engineStatus}
            className={`p-1.5 flex-shrink-0 rounded-lg transition-colors hover:bg-black/5 disabled:opacity-40${listening || recording ? " animate-pulse" : ""}`}
            style={{ color: listening || recording ? C.rose : C.ink100 }}
            title={listening || recording ? "Stop voice input" : "Speak your question"}>
            <Icons.mic size={15} />
          </button>
          <input value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder={listening || recording ? "Listening… speak now" : "Ask Mentora AI... (English or اردو)"}
            className="flex-1 text-[13px] outline-none bg-transparent" style={{ color: C.ink700 }} />
          <button onClick={() => send(input)} disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white flex-shrink-0 transition-all hover:brightness-110 disabled:opacity-40"
            style={{ background: G.cyan, color: C.navy }}>
            <Icons.send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ASSESSMENT SCREEN
═══════════════════════════════════════════════════════════════════════════ */
const ASSESSMENT_LENGTHS = [5, 10, 15];

function AssessmentSetup({ selection, onStart }: { selection: Selection; onStart: (subject: SubjectId, topic: string, count: number) => void }) {
  const availableSubjects = selection.subjects.length > 0 ? selection.subjects : SUBJECTS.map(s => s.id);
  const [subject, setSubject] = useState<SubjectId>(availableSubjects[0] ?? "math");
  const [topic, setTopic]     = useState<string>("all");
  const [count, setCount]     = useState<number>(5);

  const subjectMeta = SUBJECTS.find(s => s.id === subject)!;
  const topicOptions = [{ value: "all", label: "All topics (mixed)" }, ...TOPICS_BY_SUBJECT[subject].map(t => ({ value: t, label: t }))];

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.clipboard size={16} /></div>
        <div>
          <h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Assessment</h2>
          <p className="text-[12px]" style={{ color: C.ink300 }}>Pick a subject and topic to test yourself with quick MCQs.</p>
        </div>
      </div>

      <Card className="p-4 space-y-3.5">
        <FilterSelect label="Subject" value={subject} onChange={v => { setSubject(v as SubjectId); setTopic("all"); }}
          options={SUBJECTS.filter(s => availableSubjects.includes(s.id)).map(s => ({ value: s.id, label: s.name }))} />
        <FilterSelect label="Topic" value={topic} onChange={setTopic} options={topicOptions} />
        <FilterSelect label="Number of Questions" value={String(count)} onChange={v => setCount(Number(v))}
          options={ASSESSMENT_LENGTHS.map(n => ({ value: String(n), label: `${n} questions` }))} />
      </Card>

      <Card className="p-4">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-wide mb-1" style={{ color: C.ink300 }}>You're about to start</p>
        <p className="text-[14px] font-semibold" style={{ color: C.ink900 }}>
          {subjectMeta.name} · {topic === "all" ? "All topics" : topic} · {count} questions
        </p>
      </Card>

      <button onClick={() => onStart(subject, topic, count)}
        className="w-full py-3 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 active:scale-[.98] transition-all"
        style={{ background: G.brand }}>
        Start Assessment
      </button>
    </div>
  );
}

function AssessmentResultsView({ result, subjectName, topicLabel, onRetake, onNewSetup, title = "Assessment Complete!", retakeLabel = "Retake Assessment", newSetupLabel = "Choose Different Topic", showExplanations = false }: {
  result: AssessmentResult; subjectName: string; topicLabel: string; onRetake: () => void; onNewSetup: () => void;
  title?: string; retakeLabel?: string; newSetupLabel?: string; showExplanations?: boolean;
}) {
  const { total, correctCount, wrongCount, percentage } = result;
  return (
    <div className="max-w-lg mx-auto space-y-5">
      <Card className="p-6 text-center">
        <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: G.cyan }}><Icons.sparkle size={22} /></div>
        <h2 className="font-display font-bold text-[22px]" style={{ color: C.ink900 }}>{title}</h2>
        <p className="text-[13px] mt-1 mb-4" style={{ color: C.ink300 }}>{subjectName} · {topicLabel}</p>
        <div className="relative inline-flex items-center justify-center" style={{ width: 96, height: 96 }}>
          <svg width="96" height="96" style={{ transform: "rotate(-90deg)", position: "absolute" }}>
            <circle cx="48" cy="48" r="40" fill="none" stroke={C.surf3} strokeWidth="8"/>
            <circle cx="48" cy="48" r="40" fill="none" stroke={C.brand} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={251} strokeDashoffset={251 * (1 - percentage/100)}
              style={{ transition: "stroke-dashoffset 1s ease" }}/>
          </svg>
          <p className="font-display font-bold text-[20px] relative z-10" style={{ color: C.ink900 }}>{percentage}%</p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 mt-5">
          <div className="rounded-xl p-3" style={{ background: C.surf1 }}>
            <p className="font-display font-bold text-[18px]" style={{ color: C.ink900 }}>{total}</p>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wide mt-0.5" style={{ color: C.ink300 }}>Total</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: C.emeraldSoft }}>
            <p className="font-display font-bold text-[18px]" style={{ color: C.emerald }}>{correctCount}</p>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wide mt-0.5" style={{ color: C.emerald }}>Correct</p>
          </div>
          <div className="rounded-xl p-3" style={{ background: C.roseSoft }}>
            <p className="font-display font-bold text-[18px]" style={{ color: C.rose }}>{wrongCount}</p>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wide mt-0.5" style={{ color: C.rose }}>Wrong</p>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-display font-bold text-[15px] mb-4" style={{ color: C.ink900 }}>Answer Review</h3>
        <div className="space-y-2.5">
          {result.answers.map((a, i) => (
            <div key={a.questionId} className="rounded-xl p-3.5" style={{ background: a.isCorrect ? C.emeraldSoft : C.roseSoft }}>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold mt-0.5"
                  style={{ background: a.isCorrect ? C.emerald : C.rose }}>
                  {a.isCorrect ? <Icons.check size={11} /> : (i + 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium" style={{ color: C.ink900 }}>{a.questionText}</p>
                  <p className="text-[12px] mt-1" style={{ color: a.isCorrect ? C.emerald : C.rose }}>
                    Your answer: {a.selectedIndex !== null ? a.options[a.selectedIndex] : "Not answered"}
                  </p>
                  {!a.isCorrect && (
                    <p className="text-[12px]" style={{ color: C.ink500 }}>Correct answer: {a.options[a.correctIndex]}</p>
                  )}
                  {showExplanations && a.explanation && (
                    <p className="text-[12px] mt-1.5 pt-1.5 leading-relaxed" style={{ color: C.ink500, borderTop: "1px dashed rgba(0,0,0,0.08)" }}>
                      <span className="font-semibold">Why:</span> {a.explanation}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex gap-2.5">
        <button onClick={onNewSetup}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold border transition-all"
          style={{ borderColor: C.border, color: C.ink700, background: "#fff" }}>
          {newSetupLabel}
        </button>
        <button onClick={onRetake}
          className="flex-1 py-3 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 active:scale-[.98] transition-all"
          style={{ background: G.brand }}>
          {retakeLabel}
        </button>
      </div>
    </div>
  );
}

function AssessmentScreen({ selection, userId }: { selection: Selection; userId: string | null }) {
  const [config, setConfig] = useState<{ subject: SubjectId; topic: string; count: number } | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [idx, setIdx]             = useState(0);
  const [selected, setSelected]   = useState<(number | null)[]>([]);
  const [result, setResult]       = useState<AssessmentResult | null>(null);

  const startAssessment = (subject: SubjectId, topic: string, count: number) => {
    const qs = getAssessmentQuestions(subject, topic, count);
    setConfig({ subject, topic, count });
    setQuestions(qs);
    setSelected(new Array(qs.length).fill(null));
    setIdx(0);
    setResult(null);
  };

  const retake = () => {
    if (!config) return;
    startAssessment(config.subject, config.topic, config.count);
  };

  const backToSetup = () => {
    setConfig(null);
    setQuestions([]);
    setResult(null);
  };

  const chooseAnswer = (optionIndex: number) => {
    setSelected(prev => { const next = [...prev]; next[idx] = optionIndex; return next; });
  };

  const submitTest = () => {
    if (!config) return;
    const answers: AssessmentAnswer[] = questions.map((q, i) => ({
      questionId: q.id,
      questionText: q.text,
      topic: q.topic,
      options: q.options,
      selectedIndex: selected[i],
      correctIndex: q.correctIndex,
      isCorrect: selected[i] === q.correctIndex,
    }));
    const correctCount = answers.filter(a => a.isCorrect).length;
    const total = questions.length;
    const finished: AssessmentResult = {
      id: `${config.subject}-${config.topic}-${Date.now()}`,
      mode: "test",
      subject: config.subject,
      topic: config.topic,
      takenAt: new Date().toISOString(),
      total,
      correctCount,
      wrongCount: total - correctCount,
      percentage: total > 0 ? Math.round((correctCount / total) * 100) : 0,
      answers,
    };
    saveAssessmentResult(finished, userId);
    setResult(finished);
  };

  if (!config) {
    return <AssessmentSetup selection={selection} onStart={startAssessment} />;
  }

  if (result) {
    const subjectName = SUBJECTS.find(s => s.id === config.subject)!.name;
    const topicLabel = config.topic === "all" ? "All topics" : config.topic;
    return <AssessmentResultsView result={result} subjectName={subjectName} topicLabel={topicLabel} onRetake={retake} onNewSetup={backToSetup} />;
  }

  const q = questions[idx];
  const total = questions.length;
  const answeredSet = new Set(selected.map((v, i) => (v !== null ? i : -1)).filter(i => i >= 0));
  const isLast = idx === total - 1;
  const allAnswered = selected.every(v => v !== null);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest" style={{ color: C.ink300 }}>
            Question {idx + 1} of {total}
          </p>
          <button onClick={submitTest} className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors" style={{ color: C.brand, background: C.brandSoft }}>
            Submit Test
          </button>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surf3 }}>
          <div className="h-full rounded-full" style={{ width: `${((idx+1)/total)*100}%`, background: G.cyan, transition: "width .5s ease" }}/>
        </div>
      </div>

      <Card className="p-4">
        <QuestionPalette total={total} current={idx} onJump={setIdx} answered={answeredSet} />
      </Card>

      <Card className="overflow-hidden">
        <div className="h-0.5" style={{ background: G.navPill }} />
        <div className="p-6 pb-4">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-3" style={{ color: C.cyan }}>
            {SUBJECTS.find(s => s.id === config.subject)!.name} · {q.marks} mark{q.marks > 1 ? "s" : ""}
          </p>
          <div className="rounded-xl p-4 text-center mb-5" style={{ background: C.surf1, border: `1px solid ${C.border}` }}>
            <p className="font-mono font-semibold text-[16px]" style={{ color: C.ink900 }}>{q.text}</p>
          </div>
          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              const isSel = selected[idx] === i;
              const st: React.CSSProperties = isSel
                ? { borderColor: C.brand, background: C.brandSoft, color: C.brand }
                : { borderColor: C.border, background: "#fff", color: C.ink700 };
              const lSt: React.CSSProperties = isSel
                ? { background: C.brand, color: "#fff" }
                : { background: C.surf2, color: C.ink300 };
              return (
                <button key={i} onClick={() => chooseAnswer(i)}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all hover:scale-[1.01]"
                  style={st}>
                  <span className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold font-mono" style={lSt}>{String.fromCharCode(65+i)}</span>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      </Card>

      <div className="flex gap-2.5">
        <button onClick={() => setIdx(i => Math.max(0, i - 1))} disabled={idx === 0}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all disabled:opacity-40"
          style={{ borderColor: C.border, color: C.ink700, background: "#fff" }}>
          ← Previous
        </button>
        {isLast
          ? <button onClick={submitTest} disabled={!allAnswered}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-40 transition-all" style={{ background: G.brand }}>
              Submit Test
            </button>
          : <button onClick={() => setIdx(i => Math.min(total - 1, i + 1))}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 transition-all" style={{ background: G.brand }}>
              Next Question →
            </button>
        }
      </div>
      {isLast && !allAnswered && (
        <p className="text-[11px] text-center" style={{ color: C.ink300 }}>Answer all questions to submit, or use "Submit Test" above to submit early.</p>
      )}
    </div>
  );
}


/* ═══════════════════════════════════════════════════════════════════════════
   PRACTICE SCREEN
═══════════════════════════════════════════════════════════════════════════ */
const PRACTICE_LENGTHS = [5, 8, 10];

type PracticeTarget = { subject: SubjectId; topic: string } | null;

function PracticeSetup({ selection, target, weakTopics, onStart }: {
  selection: Selection; target: PracticeTarget; weakTopics: WeakTopic[]; onStart: (subject: SubjectId, topic: string, count: number) => void;
}) {
  const availableSubjects = selection.subjects.length > 0 ? selection.subjects : SUBJECTS.map(s => s.id);
  const [subject, setSubject] = useState<SubjectId>(target?.subject ?? availableSubjects[0] ?? "math");
  const [topic, setTopic]     = useState<string>(target?.topic ?? "all");
  const [count, setCount]     = useState<number>(5);

  const subjectMeta = SUBJECTS.find(s => s.id === subject)!;
  const topicOptions = [{ value: "all", label: "All topics (mixed)" }, ...TOPICS_BY_SUBJECT[subject].map(t => ({ value: t, label: t }))];
  const weakForSubject = weakTopics.filter(w => w.subject === subject);
  const weakChips = weakForSubject.slice(0, 4);

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.pen size={16} /></div>
        <div>
          <h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Practice</h2>
          <p className="text-[12px]" style={{ color: C.ink300 }}>
            {target ? `Targeted practice for ${target.topic === "all" ? subjectMeta.name : target.topic}.` : "Fresh questions picked for your weak topics — with instant answers and explanations."}
          </p>
        </div>
      </div>

      {weakForSubject.length > 0 && (
        <Card className="p-4">
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wide mb-2" style={{ color: C.ink300 }}>Weak topics detected</p>
          <div className="flex flex-wrap gap-1.5">
            {weakChips.map(w => (
              <span key={w.topic} className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ background: C.roseSoft, color: C.rose }}>
                {w.topic} · {w.wrongCount} missed
              </span>
            ))}
            {weakForSubject.length > weakChips.length && (
              <span className="text-[11px] font-medium px-2 py-1 rounded-lg" style={{ background: C.surf2, color: C.ink500 }}>
                +{weakForSubject.length - weakChips.length} more
              </span>
            )}
          </div>
          <p className="text-[11px] mt-2" style={{ color: C.ink300 }}>
            {topic === "all"
              ? "Practice will focus on these topics first."
              : weakForSubject.some(w => w.topic === topic)
                ? "This topic is on your weak list — you'll get fresh questions for it."
                : "Tip: choose “All topics” to let practice focus on your weak areas."}
          </p>
        </Card>
      )}

      <Card className="p-4 space-y-3.5">
        <FilterSelect label="Subject" value={subject} onChange={v => { setSubject(v as SubjectId); setTopic("all"); }}
          options={SUBJECTS.filter(s => availableSubjects.includes(s.id)).map(s => ({ value: s.id, label: s.name }))} />
        <FilterSelect label="Topic" value={topic} onChange={setTopic} options={topicOptions} />
        <FilterSelect label="Number of Questions" value={String(count)} onChange={v => setCount(Number(v))}
          options={PRACTICE_LENGTHS.map(n => ({ value: String(n), label: `${n} questions` }))} />
      </Card>

      <button onClick={() => onStart(subject, topic, count)}
        className="w-full py-3 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 active:scale-[.98] transition-all"
        style={{ background: G.brand }}>
        Start Practice
      </button>
    </div>
  );
}

function PracticeScreen({ selection, target, userId }: { selection: Selection; target: PracticeTarget; userId: string | null }) {
  const [config, setConfig]       = useState<{ subject: SubjectId; topic: string; count: number } | null>(null);
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [idx, setIdx]             = useState(0);
  const [answers, setAnswers]     = useState<AssessmentAnswer[]>([]);
  const [sel, setSel]             = useState<number | null>(null);
  const [checked, setChecked]     = useState(false);
  const [hint, setHint]           = useState(false);
  const [result, setResult]       = useState<AssessmentResult | null>(null);
  /* Weak topics come from the student's saved mistakes — practice weights its
     fresh questions toward them. Refreshed when returning to the setup screen. */
  const [weakTopics, setWeakTopics] = useState<WeakTopic[]>(() => getWeakTopics(userId));

  const startPractice = (subject: SubjectId, topic: string, count: number) => {
    /* Practice deliberately uses its own question bank (never the assessment
       generator), weighted toward the student's weak topics. */
    const qs = getPracticeQuestions(subject, topic, count, weakTopics, userId);
    markPracticeSeen(qs, userId);
    setConfig({ subject, topic, count });
    setQuestions(qs);
    setAnswers([]);
    setIdx(0);
    setSel(null);
    setChecked(false);
    setHint(false);
    setResult(null);
  };

  // Auto-start immediately when arriving from a "Practice this weak topic" link.
  useEffect(() => {
    if (target) startPractice(target.subject, target.topic, 5);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const q = questions[idx];
  const total = questions.length;

  const checkAnswer = () => {
    if (sel === null || !q) return;
    setChecked(true);
    setAnswers(prev => [...prev, {
      questionId: q.id, questionText: q.text, topic: q.topic, options: q.options,
      selectedIndex: sel, correctIndex: q.correctIndex, isCorrect: sel === q.correctIndex,
      explanation: q.explanation,
    }]);
  };

  const finishPractice = (finalAnswers: AssessmentAnswer[]) => {
    if (!config) return;
    const correctCount = finalAnswers.filter(a => a.isCorrect).length;
    const finished: AssessmentResult = {
      id: `practice-${config.subject}-${config.topic}-${Date.now()}`,
      mode: "practice",
      subject: config.subject,
      topic: config.topic,
      takenAt: new Date().toISOString(),
      total: finalAnswers.length,
      correctCount,
      wrongCount: finalAnswers.length - correctCount,
      percentage: finalAnswers.length > 0 ? Math.round((correctCount / finalAnswers.length) * 100) : 0,
      answers: finalAnswers,
    };
    saveAssessmentResult(finished, userId);
    setResult(finished);
  };

  const goNext = () => {
    if (idx < total - 1) {
      setIdx(i => i + 1);
      setSel(null);
      setChecked(false);
      setHint(false);
    } else {
      finishPractice(answers);
    }
  };

  const backToSetup = () => {
    setConfig(null); setQuestions([]); setResult(null);
    setWeakTopics(getWeakTopics(userId));  // reflect mistakes just recorded
  };
  const retake = () => { if (config) startPractice(config.subject, config.topic, config.count); };

  if (!config) {
    return <PracticeSetup selection={selection} target={target} weakTopics={weakTopics} onStart={startPractice} />;
  }

  if (result) {
    const subjectName = SUBJECTS.find(s => s.id === config.subject)!.name;
    const topicLabel = config.topic === "all" ? "All topics" : config.topic;
    return (
      <AssessmentResultsView
        result={result} subjectName={subjectName} topicLabel={topicLabel}
        onRetake={retake} onNewSetup={backToSetup}
        title="Practice Complete!" retakeLabel="Practice Again" newSetupLabel="Choose Different Topic"
        showExplanations
      />
    );
  }

  if (!q) return null;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="flex gap-2">
        {[
          { l: "Practice Session", c: C.brand, bg: C.brandSoft },
          { l: SUBJECTS.find(s => s.id === config.subject)!.name, c: C.cyan, bg: C.cyanSoft },
          { l: q.topic, c: C.amber, bg: C.amberSoft },
        ].map(t => (
          <span key={t.l} className="text-[10px] font-mono font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full truncate max-w-[33%]" style={{ color: t.c, background: t.bg }}>{t.l}</span>
        ))}
      </div>

      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: C.surf3 }}>
        <div className="h-full rounded-full" style={{ width: `${((idx + 1) / total) * 100}%`, background: G.cyan, transition: "width .5s ease" }} />
      </div>

      <Card className="overflow-hidden">
        <div className="p-8 text-center relative overflow-hidden" style={{ background: G.hero, borderBottom: `1px solid ${C.border}` }}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(circle at 70% 50%, rgba(0,207,237,0.12), transparent 60%)" }} />
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-3 relative z-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Question {idx + 1} of {total}
          </p>
          <p className="font-mono font-bold text-[18px] text-white relative z-10 leading-snug">{q.text}</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="space-y-2.5">
            {q.options.map((opt, i) => {
              let st: React.CSSProperties = { borderColor: C.border, background: "#fff", color: C.ink700 };
              let lSt: React.CSSProperties = { background: C.surf2, color: C.ink300 };
              if (sel === i && !checked) { st = { borderColor: C.brand, background: C.brandSoft, color: C.brand }; lSt = { background: C.brand, color: "#fff" }; }
              if (checked && i === q.correctIndex) { st = { borderColor: C.emerald, background: C.emeraldSoft, color: C.ink700 }; lSt = { background: C.emerald, color: "#fff" }; }
              if (checked && sel === i && i !== q.correctIndex) { st = { borderColor: C.rose, background: C.roseSoft, color: C.ink700 }; lSt = { background: C.rose, color: "#fff" }; }
              return (
                <button key={i} onClick={() => !checked && setSel(i)} disabled={checked}
                  className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all hover:scale-[1.01] disabled:cursor-default"
                  style={st}>
                  <span className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold font-mono" style={lSt}>{String.fromCharCode(65 + i)}</span>
                  {opt}
                  {checked && i === q.correctIndex && <span className="ml-auto" style={{ color: C.emerald }}><Icons.check size={15} /></span>}
                </button>
              );
            })}
          </div>

          {checked && (
            <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: sel === q.correctIndex ? C.emeraldSoft : C.roseSoft }}>
              <span style={{ color: sel === q.correctIndex ? C.emerald : C.rose }}>{sel === q.correctIndex ? <Icons.check size={16} /> : <Icons.alert size={16} />}</span>
              <p className="text-[13px] font-medium" style={{ color: sel === q.correctIndex ? C.emerald : C.rose }}>
                {sel === q.correctIndex ? "Correct! Well done 🎉" : `Not quite — correct answer: ${q.options[q.correctIndex]}`}
              </p>
            </div>
          )}
          {checked && (
            <div className="px-4 py-3 rounded-xl" style={{ background: C.surf1, border: `1px solid ${C.border}` }}>
              <p className="text-[11px] font-mono font-semibold uppercase tracking-wide mb-1" style={{ color: C.brand }}>Explanation</p>
              <p className="text-[13px] leading-relaxed" style={{ color: C.ink700 }}>{q.explanation}</p>
            </div>
          )}
          {!checked && hint && (
            <div className="px-4 py-3 rounded-xl" style={{ background: C.amberSoft }}>
              <p className="text-[12px] font-bold mb-1" style={{ color: C.amber }}>💡 Hint</p>
              <p className="text-[13px]" style={{ color: "#92400E" }}>{q.explanation}</p>
            </div>
          )}

          <div className="flex gap-2.5">
            {!checked ? (
              <>
                <button onClick={checkAnswer} disabled={sel === null}
                  className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-40 transition-all" style={{ background: G.brand }}>
                  Submit Answer
                </button>
                <button onClick={() => setHint(true)}
                  className="px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all hover:border-amber-400 hover:text-amber-500"
                  style={{ borderColor: C.border, color: C.ink300, background: C.surf1 }}>
                  Get Hint
                </button>
              </>
            ) : (
              <button onClick={goNext}
                className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 transition-all" style={{ background: G.brand }}>
                {idx < total - 1 ? "Next Question →" : "See My Results →"}
              </button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MISTAKE ANALYZER
═══════════════════════════════════════════════════════════════════════════ */
function EmptyMistakeState({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <Card className="p-8 text-center">
      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: G.cyan }}><Icons.search size={22} /></div>
      <h3 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Nothing to analyze yet</h3>
      <p className="text-[13px] mt-1.5 mb-5 max-w-sm mx-auto" style={{ color: C.ink300 }}>
        Take an assessment or a practice session, and any wrong answers will show up here — broken down by subject and topic.
      </p>
      <button onClick={() => onNav("assessment")}
        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[.97]"
        style={{ background: G.brand }}>
        Take an Assessment
      </button>
    </Card>
  );
}

function MistakeScreen({ onNav, onPractice, userId }: { onNav: (s: Screen) => void; onPractice: (subject: SubjectId, topic: string) => void; userId: string | null }) {
  const results = loadAssessmentResults(userId);
  const topicStats = getTopicStats(results);
  const mistakes = getMistakeBreakdown(results);
  const weakTopics = topicStats.filter(t => t.pct < 55).slice(0, 5);
  const strongTopics = [...topicStats].filter(t => t.pct >= 75).sort((a, b) => b.pct - a.pct).slice(0, 5);

  if (results.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.search size={16}/></div>
          <div><h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Mistake Analyzer</h2><p className="text-[12px]" style={{ color: C.ink300 }}>Understanding exactly where you went wrong</p></div>
        </div>
        <EmptyMistakeState onNav={onNav} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.search size={16}/></div>
        <div><h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Mistake Analyzer</h2><p className="text-[12px]" style={{ color: C.ink300 }}>Wrong answers, grouped by subject and topic, from your saved test &amp; practice results</p></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><span>⚠️</span><h3 className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>Weak Topics</h3></div>
          {weakTopics.length > 0 ? (
            <div className="space-y-2">
              {weakTopics.map(t => (
                <div key={`${t.subject}-${t.topic}`} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl" style={{ background: C.roseSoft }}>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: C.ink700 }}>{t.topic}</p>
                    <p className="text-[10px]" style={{ color: C.ink300 }}>{t.subjectName} · {t.pct}% ({t.correct}/{t.attempts})</p>
                  </div>
                  <button onClick={() => onPractice(t.subject, t.topic)}
                    className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white hover:brightness-110 transition-all" style={{ background: G.brand }}>
                    Practice
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: C.ink300 }}>No weak topics detected yet — keep testing yourself!</p>
          )}
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4"><span>💪</span><h3 className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>Strong Topics</h3></div>
          {strongTopics.length > 0 ? (
            <div className="space-y-2">
              {strongTopics.map(t => (
                <div key={`${t.subject}-${t.topic}`} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: C.emeraldSoft }}>
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium truncate" style={{ color: C.ink700 }}>{t.topic}</p>
                    <p className="text-[10px]" style={{ color: C.ink300 }}>{t.subjectName}</p>
                  </div>
                  <span className="font-mono text-[11px] font-semibold flex-shrink-0" style={{ color: C.emerald }}>{t.pct}%</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[12px]" style={{ color: C.ink300 }}>Score 75%+ on a topic to see it here.</p>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-display font-bold text-[15px] mb-1" style={{ color: C.ink900 }}>Recent Mistakes</h3>
        <p className="text-[12px] mb-4" style={{ color: C.ink300 }}>Grouped by subject &amp; topic, most missed first</p>
        {mistakes.length === 0 ? (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl" style={{ background: C.emeraldSoft }}>
            <span style={{ color: C.emerald }}><Icons.check size={16} /></span>
            <p className="text-[13px] font-semibold" style={{ color: C.emerald }}>No wrong answers recorded — great job!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {mistakes.map(m => (
              <div key={`${m.subject}-${m.topic}`} className="rounded-2xl p-4 border" style={{ background: C.roseSoft, borderColor: "#FCA5A5" }}>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold" style={{ color: "#991B1B" }}>{m.subjectName} · {m.topic}</p>
                    <p className="text-[11px]" style={{ color: "#991B1B99" }}>
                      Missed {m.wrongCount} of {m.attemptCount} · last {timeAgo(m.lastMissed)}
                    </p>
                  </div>
                  <button onClick={() => onPractice(m.subject, m.topic)}
                    className="flex-shrink-0 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white hover:brightness-110 transition-all" style={{ background: G.brand }}>
                    Practice This Topic
                  </button>
                </div>
                <div className="space-y-2">
                  {m.examples.map((ex, i) => (
                    <div key={i} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.55)" }}>
                      <p className="text-[12px] font-medium" style={{ color: "#7F1D1D" }}>{ex.questionText}</p>
                      <p className="text-[11px] mt-1" style={{ color: "#991B1B" }}>Your answer: {ex.yourAnswer}</p>
                      <p className="text-[11px]" style={{ color: "#065F46" }}>Correct answer: {ex.correctAnswer}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROGRESS SCREEN
═══════════════════════════════════════════════════════════════════════════ */
const WEEKLY = [{ day:"Mon",mins:25 },{ day:"Tue",mins:40 },{ day:"Wed",mins:55 },{ day:"Thu",mins:30 },{ day:"Fri",mins:45 },{ day:"Sat",mins:20 },{ day:"Sun",mins:35 }];
const SUBJECT_PROGRESS_COLORS = [C.brand, C.teal, C.violet, C.amber, C.cyan, C.rose, C.emerald];

function StatusBadge({ pct }: { pct: number }) {
  const [l,col,bg] = pct>=75 ? ["Strong",C.emerald,C.emeraldSoft] : pct>=55 ? ["Good",C.brand,C.brandSoft] : pct>=40 ? ["Developing",C.amber,C.amberSoft] : ["Needs Practice",C.rose,C.roseSoft];
  return <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full" style={{ color: col, background: bg }}>{l}</span>;
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? "" : "s"} ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString();
}

type SubjectStat = { subject: SubjectId; name: string; attempts: number; questions: number; correct: number; pct: number; color: string };

function computeSubjectStats(results: AssessmentResult[]): SubjectStat[] {
  const bySubject = new Map<SubjectId, { attempts: number; questions: number; correct: number }>();
  for (const r of results) {
    const cur = bySubject.get(r.subject) ?? { attempts: 0, questions: 0, correct: 0 };
    cur.attempts += 1;
    cur.questions += r.total;
    cur.correct += r.correctCount;
    bySubject.set(r.subject, cur);
  }
  return Array.from(bySubject.entries()).map(([subject, v], i) => ({
    subject,
    name: SUBJECTS.find(s => s.id === subject)?.name ?? subject,
    attempts: v.attempts,
    questions: v.questions,
    correct: v.correct,
    pct: v.questions > 0 ? Math.round((v.correct / v.questions) * 100) : 0,
    color: SUBJECT_PROGRESS_COLORS[i % SUBJECT_PROGRESS_COLORS.length],
  })).sort((a, b) => b.pct - a.pct);
}

/* ── Exam Performance Prediction ─────────────────────────────────────────
   Heuristic projection from saved results: recency-weighted accuracy,
   subject coverage and recent trend → readiness %, predicted score band,
   strengths, weak areas and one simple recommendation. */
type PredictionArea = { subject: SubjectId; subjectName: string; topic: string; pct: number; attempts: number };

type ExamPrediction = {
  readiness: number;
  band: [number, number];
  confidence: "Low" | "Medium" | "High";
  strengths: PredictionArea[];
  weakAreas: PredictionArea[];
  recommendation: string;
  cta: { subject: SubjectId; topic: string } | null;
  basis: string;
};

function computeExamPrediction(results: AssessmentResult[], selection: Selection): ExamPrediction | null {
  if (results.length === 0) return null;

  const sorted = [...results].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
  const totalQuestions = results.reduce((s, r) => s + r.total, 0);

  /* 1. Recency-weighted, question-level accuracy (newest tests count up to ~2.5×). */
  let wCorrect = 0, wTotal = 0;
  sorted.forEach((r, i) => {
    const w = 1 + (sorted.length > 1 ? (i / (sorted.length - 1)) * 1.5 : 0);
    wCorrect += r.correctCount * w;
    wTotal += r.total * w;
  });
  const weightedAcc = wTotal > 0 ? wCorrect / wTotal : 0;

  /* 2. Trend: average of the last 3 results vs the 3 before that. */
  const avg = (arr: AssessmentResult[]) => arr.length ? arr.reduce((s, r) => s + r.percentage, 0) / arr.length : 0;
  const trend = sorted.length >= 4 ? avg(sorted.slice(-3)) - avg(sorted.slice(-6, -3)) : 0;

  /* 3. Coverage: how many of the student's chosen subjects have results. */
  const withData = new Set(results.map(r => r.subject));
  const target = selection.subjects.length > 0 ? selection.subjects : Array.from(withData);
  const coverage = target.length > 0 ? Math.min(1, withData.size / target.length) : 1;

  /* 4. Data volume: the estimate firms up as more questions are answered. */
  const volume = Math.min(1, totalQuestions / 50);

  const readiness = Math.round(Math.min(100, Math.max(0,
    100 * (0.72 * weightedAcc + 0.16 * coverage + 0.12 * volume) + Math.min(5, Math.max(-5, trend * 0.5)),
  )));

  const confidence: ExamPrediction["confidence"] = totalQuestions < 20 ? "Low" : totalQuestions < 60 ? "Medium" : "High";
  const bandHalf = confidence === "Low" ? 12 : confidence === "Medium" ? 8 : 5;
  const band: [number, number] = [Math.max(0, readiness - bandHalf), Math.min(100, readiness + bandHalf)];

  /* 5. Strengths & weak areas from topic-level stats (2+ attempts to count). */
  const areas: PredictionArea[] = getTopicStats(results)
    .filter(t => t.attempts >= 2)
    .map(t => ({ subject: t.subject, subjectName: t.subjectName, topic: t.topic, pct: t.pct, attempts: t.attempts }));
  const strengths = areas.filter(a => a.pct >= 75).sort((a, b) => b.pct - a.pct || b.attempts - a.attempts).slice(0, 3);
  const weakAreas = areas.filter(a => a.pct < 55).sort((a, b) => a.pct - b.pct || b.attempts - a.attempts).slice(0, 3);

  /* 6. One simple recommendation + next action. */
  let recommendation: string;
  let cta: { subject: SubjectId; topic: string } | null = null;
  if (weakAreas.length > 0) {
    const w = weakAreas[0];
    recommendation = `Your weakest topic is ${w.topic} (${w.pct}% in ${w.subjectName}). Practising it now is the fastest way to lift your predicted exam score.`;
    cta = { subject: w.subject, topic: w.topic };
  } else if (coverage < 1) {
    const missing = target.filter(s => !withData.has(s))
      .map(s => SUBJECTS.find(x => x.id === s)?.name ?? s).join(", ");
    recommendation = `You haven't been tested on ${missing} yet — take an assessment there to complete your readiness picture.`;
  } else if (readiness >= 80) {
    recommendation = "You're on track for a strong result. Keep revising with past papers to stay sharp.";
  } else {
    recommendation = "Steady progress — keep practising consistently and your readiness will climb with every test.";
  }

  const basis = `Based on ${results.length} result${results.length === 1 ? "" : "s"} · ${totalQuestions} questions · ${withData.size} subject${withData.size === 1 ? "" : "s"}`;
  return { readiness, band, confidence, strengths, weakAreas, recommendation, cta, basis };
}

function ReadinessGauge({ pct, size = 118 }: { pct: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <defs>
        <linearGradient id="readinessGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={C.brand} />
          <stop offset="100%" stopColor={C.cyan} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C.surf3} strokeWidth={9} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="url(#readinessGrad)" strokeWidth={9}
        strokeLinecap="round" strokeDasharray={`${filled} ${circ - filled}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="46%" textAnchor="middle" dominantBaseline="middle"
        className="font-display font-bold" fill={C.ink900} fontSize={size * 0.21}>{pct}%</text>
      <text x="50%" y="62%" textAnchor="middle" dominantBaseline="middle"
        fill={C.ink300} fontSize={size * 0.08} fontFamily="ui-monospace, monospace" letterSpacing={1.5}>READY</text>
    </svg>
  );
}

function EmptyProgressState({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <Card className="p-8 text-center">
      <div className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: G.cyan }}><Icons.clipboard size={22} /></div>
      <h3 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>No test results yet</h3>
      <p className="text-[13px] mt-1.5 mb-5 max-w-sm mx-auto" style={{ color: C.ink300 }}>
        Take an assessment to start tracking your score, accuracy, and progress over time.
      </p>
      <button onClick={() => onNav("assessment")}
        className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[.97]"
        style={{ background: G.brand }}>
        Take an Assessment
      </button>
    </Card>
  );
}

function ProgressScreen({ onNav, onPractice, userId, selection }: { onNav: (s: Screen) => void; onPractice: (subject: SubjectId, topic: string) => void; userId: string | null; selection: Selection }) {
  const results = loadAssessmentResults(userId);
  const prediction = computeExamPrediction(results, selection);
  const totalTests = results.length;
  const testCount = results.filter(r => r.mode === "test").length;
  const practiceCount = results.filter(r => r.mode === "practice").length;
  const totalQuestions = results.reduce((sum, r) => sum + r.total, 0);
  const totalCorrect = results.reduce((sum, r) => sum + r.correctCount, 0);
  const overallPct = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const chronological = [...results].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
  const recent = [...results].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()).slice(0, 6);

  const last = chronological[chronological.length - 1];
  const prev = chronological[chronological.length - 2];
  const delta = last && prev ? last.percentage - prev.percentage : null;

  const subjectStats = computeSubjectStats(results);
  const needsPractice = subjectStats.filter(s => s.pct < 55).slice(0, 4);
  const strongAt = subjectStats.filter(s => s.pct >= 75).slice(0, 4);

  const KPI = [
    { label: "Tests Completed",     val: String(totalTests),      sub: totalTests > 0 ? `${testCount} test${testCount === 1 ? "" : "s"} · ${practiceCount} practice` : "No tests yet", Icon: Icons.clipboard, color: C.brand,   bg: C.brandSoft   },
    { label: "Questions Attempted", val: String(totalQuestions),  sub: "All time",                  Icon: Icons.book,      color: C.cyan,    bg: C.cyanSoft    },
    { label: "Overall Score",       val: `${overallPct}%`,        sub: `${totalCorrect}/${totalQuestions} correct`, Icon: Icons.target, color: C.emerald, bg: C.emeraldSoft },
    { label: "Recent Trend",        val: delta === null ? "—" : `${delta >= 0 ? "+" : ""}${delta}%`, sub: delta === null ? (totalTests === 1 ? "Take another test" : "Not enough data") : "vs previous test", Icon: Icons.trend, color: delta !== null && delta < 0 ? C.rose : C.violet, bg: delta !== null && delta < 0 ? C.roseSoft : C.purpleSoft },
  ];

  const max = Math.max(...WEEKLY.map(d=>d.mins));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPI.map((k) => (
          <Card key={k.label} className="p-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: k.bg, color: k.color }}><k.Icon size={15}/></div>
            <p className="font-display font-bold text-[24px] leading-none" style={{ color: C.ink900 }}>{k.val}</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: C.ink500 }}>{k.label}</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.ink100 }}>{k.sub}</p>
          </Card>
        ))}
      </div>

      {totalTests === 0 ? (
        <EmptyProgressState onNav={onNav} />
      ) : (
        <>
          {prediction && (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span style={{ color: C.brand }}><Icons.target size={15} /></span>
                  <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Exam Readiness Prediction</h3>
                </div>
                <span className="text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full" style={{
                  color: prediction.confidence === "High" ? C.emerald : prediction.confidence === "Medium" ? C.brand : C.amber,
                  background: prediction.confidence === "High" ? C.emeraldSoft : prediction.confidence === "Medium" ? C.brandSoft : C.amberSoft,
                }}>{prediction.confidence} confidence</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-5 items-start">
                <div className="flex flex-col items-center gap-2.5 sm:pr-5 sm:border-r h-full justify-center" style={{ borderColor: C.border }}>
                  <ReadinessGauge pct={prediction.readiness} />
                  <div className="text-center">
                    <p className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>{prediction.band[0]}–{prediction.band[1]}%</p>
                    <p className="text-[11px]" style={{ color: C.ink300 }}>Predicted exam score</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: C.emerald }}>Strengths</p>
                    {prediction.strengths.length > 0 ? (
                      <div className="space-y-1.5">
                        {prediction.strengths.map(s => (
                          <div key={`${s.subject}-${s.topic}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ background: C.emeraldSoft }}>
                            <div className="min-w-0">
                              <span className="text-[12px] font-medium block truncate" style={{ color: C.ink700 }}>{s.topic}</span>
                              <span className="text-[10px] font-mono" style={{ color: C.ink300 }}>{s.subjectName}</span>
                            </div>
                            <span className="text-[11px] font-mono font-semibold flex-shrink-0" style={{ color: C.emerald }}>{s.pct}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px]" style={{ color: C.ink300 }}>Score 75%+ on a topic (2+ attempts) to see it here.</p>
                    )}
                  </div>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-2" style={{ color: C.rose }}>Weak Areas</p>
                    {prediction.weakAreas.length > 0 ? (
                      <div className="space-y-1.5">
                        {prediction.weakAreas.map(w => (
                          <div key={`${w.subject}-${w.topic}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl" style={{ background: C.roseSoft }}>
                            <div className="min-w-0">
                              <span className="text-[12px] font-medium block truncate" style={{ color: C.ink700 }}>{w.topic}</span>
                              <span className="text-[10px] font-mono" style={{ color: C.ink300 }}>{w.subjectName} · {w.pct}%</span>
                            </div>
                            <button onClick={() => onPractice(w.subject, w.topic)}
                              className="flex-shrink-0 text-[10px] font-semibold px-2.5 py-1.5 rounded-lg text-white hover:brightness-110 transition-all" style={{ background: G.brand }}>
                              Practice
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[12px]" style={{ color: C.ink300 }}>No weak topics — great sign!</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-4 flex flex-col sm:flex-row sm:items-center gap-3" style={{ borderTop: `1px solid ${C.border}` }}>
                <div className="flex items-start gap-2.5 flex-1">
                  <span className="flex-shrink-0 mt-0.5" style={{ color: C.cyan }}><Icons.sparkle size={14} /></span>
                  <div>
                    <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-0.5" style={{ color: C.ink300 }}>Recommendation</p>
                    <p className="text-[13px] leading-relaxed" style={{ color: C.ink700 }}>{prediction.recommendation}</p>
                    <p className="text-[11px] mt-1" style={{ color: C.ink100 }}>{prediction.basis} · improves as you take more tests</p>
                  </div>
                </div>
                {prediction.cta && (
                  <button onClick={() => onPractice(prediction.cta!.subject, prediction.cta!.topic)}
                    className="flex-shrink-0 px-4 py-2.5 rounded-xl text-[12px] font-semibold text-white hover:brightness-110 active:scale-[.97] transition-all" style={{ background: G.brand }}>
                    Start Practice
                  </button>
                )}
              </div>
            </Card>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Recent Test Results</h3>
              </div>
              <div className="space-y-2.5">
                {recent.map(r => (
                  <div key={r.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl" style={{ background: C.surf1 }}>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: C.ink900 }}>
                        {SUBJECTS.find(s => s.id === r.subject)?.name ?? r.subject} · {r.topic === "all" ? "All topics" : r.topic}
                      </p>
                      <p className="text-[11px] mt-0.5" style={{ color: C.ink300 }}>
                        {r.correctCount}/{r.total} correct · {timeAgo(r.takenAt)}
                      </p>
                    </div>
                    <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ color: r.mode === "practice" ? C.violet : C.brand, background: r.mode === "practice" ? C.purpleSoft : C.brandSoft }}>
                      {r.mode}
                    </span>
                    <span className="font-mono font-bold text-[13px] flex-shrink-0" style={{ color: C.ink700 }}>{r.percentage}%</span>
                    <div className="flex-shrink-0"><StatusBadge pct={r.percentage} /></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5 flex flex-col">
              <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Performance Over Time</h3>
              <p className="text-[12px] mb-4 mt-0.5" style={{ color: C.ink300 }}>Score % per test, oldest → newest</p>
              {chronological.length >= 2 ? (
                <div className="flex-1 flex items-center justify-center">
                  <Sparkline data={chronological.map(r => r.percentage)} color={C.brand} width={220} height={90} />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center px-2">
                  <p className="text-[12px]" style={{ color: C.ink300 }}>Take one more test to see your trend line here.</p>
                </div>
              )}
              <div className="mt-3 pt-3 flex justify-between text-[12px]" style={{ borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.ink300 }}>Best score</span>
                <span className="font-mono font-semibold" style={{ color: C.ink700 }}>{Math.max(...results.map(r => r.percentage))}%</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 p-5">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Subject-wise Performance</h3>
              </div>
              <div className="space-y-4">
                {subjectStats.map(s => (
                  <div key={s.subject} className="flex items-center gap-4">
                    <p className="text-[13px] font-medium flex-shrink-0 w-32 truncate" style={{ color: C.ink700 }}>{s.name}</p>
                    <div className="flex-1 min-w-0"><Bar pct={s.pct} grad={`linear-gradient(90deg, ${s.color}, ${s.color}99)`}/></div>
                    <span className="font-mono text-[11px] w-8 text-right flex-shrink-0" style={{ color: C.ink300 }}>{s.pct}%</span>
                    <span className="text-[11px] w-20 flex-shrink-0 text-right" style={{ color: C.ink100 }}>{s.attempts} test{s.attempts === 1 ? "" : "s"}</span>
                    <div className="flex-shrink-0 w-28 flex justify-end"><StatusBadge pct={s.pct}/></div>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5 flex flex-col">
              <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Weekly Activity</h3>
              <p className="text-[12px] mb-4 mt-0.5" style={{ color: C.ink300 }}>Minutes studied · this week</p>
              <div className="flex items-end gap-1.5 flex-1">
                {WEEKLY.map(d => (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-t-lg" style={{ height: `${(d.mins/max)*88}px`, background: d.day==="Wed" ? G.navPill : C.surf3 }}/>
                    <span className="text-[10px] font-mono" style={{ color: d.day==="Wed" ? C.cyan : C.ink300 }}>{d.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 flex justify-between text-[12px]" style={{ borderTop: `1px solid ${C.border}` }}>
                <span style={{ color: C.ink300 }}>Total</span>
                <span className="font-mono font-semibold" style={{ color: C.ink700 }}>250 min</span>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><span>⚠️</span><h3 className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>Needs Practice</h3></div>
              {needsPractice.length > 0 ? (
                <div className="space-y-2">
                  {needsPractice.map(s => (
                    <div key={s.subject} className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl" style={{ background: C.roseSoft }}>
                      <div className="min-w-0">
                        <span className="text-[13px] block truncate" style={{ color: C.ink700 }}>{s.name}</span>
                        <span className="font-mono text-[11px] font-semibold" style={{ color: C.rose }}>{s.pct}%</span>
                      </div>
                      <button onClick={() => onPractice(s.subject, "all")}
                        className="flex-shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg text-white hover:brightness-110 transition-all" style={{ background: G.brand }}>
                        Practice
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px]" style={{ color: C.ink300 }}>No weak spots yet — nice work!</p>
              )}
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-4"><span>💪</span><h3 className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>You're Strong At</h3></div>
              {strongAt.length > 0 ? (
                <div className="space-y-2">
                  {strongAt.map(s => (
                    <div key={s.subject} className="flex items-center justify-between px-3 py-2.5 rounded-xl" style={{ background: C.emeraldSoft }}>
                      <span className="text-[13px]" style={{ color: C.ink700 }}>{s.name}</span>
                      <span style={{ color: C.emerald }}><Icons.check size={14}/></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[12px]" style={{ color: C.ink300 }}>Score 75%+ on a subject to see it here.</p>
              )}
            </Card>
            <button onClick={() => needsPractice[0] ? onPractice(needsPractice[0].subject, "all") : onNav("assessment")}
              className="text-left rounded-2xl p-5 transition-transform hover:scale-[1.01] active:scale-[.99]" style={{ background: C.navy, border: `1px solid rgba(0,207,237,0.20)` }}>
              <div className="flex items-center gap-2 mb-3"><span style={{ color: C.cyan }}><Icons.sparkle size={15}/></span><p className="text-[11px] font-mono font-bold uppercase tracking-wider" style={{ color: C.cyan }}>Recommended Next</p></div>
              <p className="font-display font-bold text-[15px] mb-2 text-white">
                {needsPractice[0] ? `${needsPractice[0].name} — Practice` : "Keep the streak going"}
              </p>
              <p className="text-[12px] mb-4" style={{ color: "rgba(255,255,255,0.5)" }}>
                {needsPractice[0] ? "Based on your recent assessment scores in this subject." : "Take a new assessment to keep building your progress history."}
              </p>
              <div className="flex justify-between text-[11px] font-mono font-semibold">
                <span style={{ color: "rgba(255,255,255,0.35)" }}>{needsPractice[0] ? "Tap to practice" : "Tap to start"}</span>
                <span style={{ color: C.cyan }}>~25 minutes</span>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BOARD · CLASS · SUBJECTS SETUP MODAL
═══════════════════════════════════════════════════════════════════════════ */
function SelectCard({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className="w-full text-left px-4 py-3 rounded-xl border text-[13px] font-semibold transition-all hover:scale-[1.01]"
      style={active
        ? { borderColor: C.brand, background: C.brandSoft, color: C.brand }
        : { borderColor: C.border, background: "#fff", color: C.ink700 }}>
      <span className="flex items-center justify-between">
        {children}
        {active && <span style={{ color: C.brand }}><Icons.check size={14} /></span>}
      </span>
    </button>
  );
}

function BoardSetupModal({ initial, onSave, onClose, dismissable }: {
  initial: Selection; onSave: (sel: Selection) => void; onClose: () => void; dismissable: boolean;
}) {
  const [step, setStep]   = useState<0 | 1 | 2>(0);
  const [board, setBoard] = useState<BoardId | null>(initial.board);
  const [cls, setCls]     = useState<string | null>(initial.classId);
  const [subs, setSubs]   = useState<SubjectId[]>(initial.subjects);

  const steps = ["Board", "Class", "Subjects"];
  const canNext = step === 0 ? !!board : step === 1 ? !!cls : subs.length > 0;

  const toggleSubject = (id: SubjectId) =>
    setSubs(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const finish = () => {
    if (!board || !cls || subs.length === 0) return;
    onSave({ board, classId: cls, subjects: subs });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(8,13,39,0.6)" }}>
      <div className="w-full max-w-md rounded-2xl bg-white overflow-hidden shadow-modal anim-scale-in">
        {/* Header */}
        <div className="p-6 pb-4 relative" style={{ background: G.hero }}>
          {dismissable && (
            <button onClick={onClose} className="absolute top-4 right-4 p-1 rounded-lg" style={{ color: "rgba(255,255,255,0.5)" }}>
              <Icons.x size={16} />
            </button>
          )}
          <div className="flex items-center gap-2 mb-2">
            <span style={{ fontSize: 14 }}>🇵🇰</span>
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.5)" }}>Pakistan</span>
          </div>
          <h2 className="font-display font-bold text-[19px] text-white">Set up your class</h2>
          <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            We'll personalize lessons, papers &amp; notes around your board and class.
          </p>
          {/* stepper */}
          <div className="flex items-center gap-2 mt-4">
            {steps.map((s, i) => (
              <div key={s} className="flex-1 flex items-center gap-2">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold font-mono flex-shrink-0"
                  style={{ background: i <= step ? G.cyan : "rgba(255,255,255,0.15)", color: i <= step ? C.navy : "rgba(255,255,255,0.5)" }}>
                  {i < step ? <Icons.check size={11} /> : i + 1}
                </div>
                <span className="text-[10px] font-medium hidden xs:inline" style={{ color: i <= step ? "#fff" : "rgba(255,255,255,0.4)" }}>{s}</span>
                {i < steps.length - 1 && <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.15)" }} />}
              </div>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-2.5 max-h-[360px] overflow-y-auto">
          {step === 0 && BOARDS.map(b => (
            <SelectCard key={b.id} active={board === b.id} onClick={() => setBoard(b.id)}>{b.name}</SelectCard>
          ))}
          {step === 1 && CLASSES.map(c => (
            <SelectCard key={c.id} active={cls === c.id} onClick={() => setCls(c.id)}>{c.label}</SelectCard>
          ))}
          {step === 2 && (
            <div className="grid grid-cols-2 gap-2.5">
              {SUBJECTS.map(s => (
                <SelectCard key={s.id} active={subs.includes(s.id)} onClick={() => toggleSubject(s.id)}>{s.name}</SelectCard>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 flex items-center gap-2.5">
          {step > 0 && (
            <button onClick={() => setStep(s => (s - 1) as 0 | 1 | 2)}
              className="px-4 py-2.5 rounded-xl text-[13px] font-semibold border transition-all"
              style={{ borderColor: C.border, color: C.ink500 }}>
              Back
            </button>
          )}
          {dismissable && step === 0 && (
            <button onClick={() => onSave(DEFAULT_SELECTION)} className="text-[12px] font-medium" style={{ color: C.ink300 }}>
              Skip for now
            </button>
          )}
          <div className="ml-auto">
            {step < 2 ? (
              <button onClick={() => canNext && setStep(s => (s + 1) as 0 | 1 | 2)} disabled={!canNext}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: G.brand }}>
                Continue
              </button>
            ) : (
              <button onClick={finish} disabled={!canNext}
                className="px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-40"
                style={{ background: G.brand }}>
                Save &amp; Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAST PAPERS SCREEN
═══════════════════════════════════════════════════════════════════════════ */
function FilterSelect({ label, value, onChange, options }: {
  label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <div className="flex-1 min-w-[140px]">
      <label className="block text-[10px] font-mono font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.ink300 }}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 rounded-xl text-[13px] font-medium outline-none appearance-none cursor-pointer"
        style={{ background: C.card, border: `1.5px solid ${C.border}`, color: C.ink700 }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function PastPaperCard({ paper, onOpen }: { paper: PastPaper; onOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const board = BOARDS.find(b => b.id === paper.board)!;
  const subject = SUBJECTS.find(s => s.id === paper.subject)!;
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: C.cyanSoft, color: C.cyan }}>
          <Icons.fileText size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-[13px] truncate" style={{ color: C.ink900 }}>
            {subject.name} — {paper.paperType} · {paper.year}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: C.ink300 }}>
            {board.short} · {paper.session} · {paper.totalMarks} marks · {paper.duration}
          </p>
        </div>
        <span style={{ color: C.ink300, transform: open ? "rotate(90deg)" : undefined, transition: "transform .2s" }}>
          <Icons.chevron size={14} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wide pt-3" style={{ color: C.ink300 }}>Paper Structure</p>
          {paper.sections.map(s => (
            <div key={s.name} className="flex items-center justify-between px-3 py-2 rounded-xl" style={{ background: C.surf1 }}>
              <span className="text-[12px] font-semibold" style={{ color: C.ink700 }}>{s.name}</span>
              <span className="text-[12px]" style={{ color: C.ink300 }}>{s.detail}</span>
            </div>
          ))}
          <button onClick={onOpen} className="w-full mt-1 py-2.5 rounded-xl text-[12px] font-semibold text-white transition-all hover:brightness-110" style={{ background: G.brand }}>
            Open Paper
          </button>
        </div>
      )}
    </Card>
  );
}

/* ── Paper viewer: metadata + question navigation ────────────────────────── */
function PaperMetaGrid({ paper }: { paper: PastPaper }) {
  const board = BOARDS.find(b => b.id === paper.board)!;
  const cls = CLASSES.find(c => c.id === paper.classId)!;
  const subject = SUBJECTS.find(s => s.id === paper.subject)!;
  const rows: [string, string][] = [
    ["Board", board.name], ["Class", cls.label], ["Subject", subject.name], ["Year", String(paper.year)],
    ["Session", paper.session], ["Paper Type", paper.paperType], ["Total Marks", String(paper.totalMarks)], ["Duration", paper.duration],
  ];
  return (
    <Card className="p-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {rows.map(([label, val]) => (
          <div key={label}>
            <p className="text-[10px] font-mono font-semibold uppercase tracking-wide" style={{ color: C.ink300 }}>{label}</p>
            <p className="text-[13px] font-semibold mt-0.5" style={{ color: C.ink900 }}>{val}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

function QuestionPalette({ total, current, onJump, answered }: { total: number; current: number; onJump: (i: number) => void; answered?: Set<number> }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: total }).map((_, i) => {
        const active = i === current;
        const isAnswered = answered?.has(i);
        let style: React.CSSProperties = { background: C.surf1, color: C.ink300, border: `1px solid ${C.border}` };
        if (isAnswered) style = { background: C.brandSoft, color: C.brand, border: `1px solid ${C.brand}55` };
        if (active) style = { background: G.brand as unknown as string, color: "#fff", border: "1px solid transparent" };
        return (
          <button key={i} onClick={() => onJump(i)}
            className="w-7 h-7 rounded-lg text-[11px] font-mono font-semibold flex items-center justify-center transition-all hover:scale-105"
            style={style}>
            {i + 1}
          </button>
        );
      })}
    </div>
  );
}

function MCQReviewCard({ q }: { q: MCQQuestion }) {
  const [sel, setSel] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="h-0.5" style={{ background: G.navPill }} />
      <div className="p-6 pb-4">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-3" style={{ color: C.cyan }}>
          Question {q.number} · {q.marks} mark{q.marks > 1 ? "s" : ""}
        </p>
        <p className="text-[14px] font-medium mb-5" style={{ color: C.ink900 }}>{q.text}</p>
        <div className="space-y-2.5">
          {q.options.map((opt, i) => {
            let st: React.CSSProperties = { borderColor: C.border, background: "#fff", color: C.ink700 };
            let lSt: React.CSSProperties = { background: C.surf2, color: C.ink300 };
            if (sel === i && !checked) { st = { borderColor: C.brand, background: C.brandSoft, color: C.brand }; lSt = { background: C.brand, color: "#fff" }; }
            if (checked && i === q.correctIndex) { st = { borderColor: C.emerald, background: C.emeraldSoft, color: C.ink700 }; lSt = { background: C.emerald, color: "#fff" }; }
            if (checked && sel === i && i !== q.correctIndex) { st = { borderColor: C.rose, background: C.roseSoft, color: C.ink700 }; lSt = { background: C.rose, color: "#fff" }; }
            return (
              <button key={i} onClick={() => !checked && setSel(i)} disabled={checked}
                className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-[13px] font-medium transition-all hover:scale-[1.01] disabled:cursor-default"
                style={st}>
                <span className="w-6 h-6 rounded-lg flex-shrink-0 flex items-center justify-center text-[11px] font-bold font-mono" style={lSt}>{String.fromCharCode(65 + i)}</span>
                {opt}
                {checked && i === q.correctIndex && <span className="ml-auto" style={{ color: C.emerald }}><Icons.check size={15} /></span>}
              </button>
            );
          })}
        </div>
      </div>
      {checked ? (
        <div className="px-6 pb-6">
          <div className="rounded-xl p-3 text-[13px]" style={{ background: sel === q.correctIndex ? C.emeraldSoft : C.roseSoft, color: sel === q.correctIndex ? C.emerald : C.rose }}>
            <span className="font-semibold">{sel === q.correctIndex ? "✓ Correct! " : `✗ Correct answer: ${q.options[q.correctIndex]}. `}</span>
            <span style={{ color: C.ink500 }}>{q.explanation}</span>
          </div>
        </div>
      ) : (
        <div className="px-6 pb-6">
          <button onClick={() => sel !== null && setChecked(true)} disabled={sel === null}
            className="w-full py-2.5 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-40 transition-all" style={{ background: G.brand }}>
            Check Answer
          </button>
        </div>
      )}
    </Card>
  );
}

function SubjectiveReviewCard({ q }: { q: SubjectiveQuestion }) {
  const [show, setShow] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="h-0.5" style={{ background: G.teal }} />
      <div className="p-6">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-1" style={{ color: C.teal }}>{q.sectionLabel}</p>
        <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-3" style={{ color: C.ink300 }}>Question {q.number} · {q.marks} marks</p>
        <p className="text-[14px] font-medium mb-4" style={{ color: C.ink900 }}>{q.text}</p>
        <button onClick={() => setShow(s => !s)} className="text-[12px] font-semibold px-3 py-2 rounded-lg transition-colors" style={{ color: C.brand, background: C.brandSoft }}>
          {show ? "Hide Model Answer" : "Show Model Answer"}
        </button>
        {show && (
          <div className="mt-4 rounded-xl p-4 space-y-2.5" style={{ background: C.surf1, border: `1px solid ${C.border}` }}>
            {q.answer.map((line, i) => (
              <div key={i} className="flex gap-2.5">
                <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold" style={{ background: G.teal }}>{i + 1}</span>
                <p className="text-[13px]" style={{ color: C.ink700 }}>{line}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}

function PastPaperViewer({ paper, onBack }: { paper: PastPaper; onBack: () => void }) {
  const qs = getPaperQuestions(paper);
  const total = qs.questions.length;
  const [idx, setIdx] = useState(0);
  const goto = (i: number) => setIdx(Math.max(0, Math.min(total - 1, i)));
  const subject = SUBJECTS.find(s => s.id === paper.subject)!;
  const board = BOARDS.find(b => b.id === paper.board)!;
  const cls = CLASSES.find(c => c.id === paper.classId)!;

  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1.5 text-[12px] font-semibold hover:opacity-70 transition-opacity" style={{ color: C.ink300 }}>
        <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icons.chevron size={14} /></span> Back to Past Papers
      </button>

      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.fileText size={16} /></div>
        <div>
          <h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>{subject.name} — {paper.paperType} · {paper.year}</h2>
          <p className="text-[12px]" style={{ color: C.ink300 }}>{board.short} · {cls.label} · {paper.session}</p>
        </div>
      </div>

      <PaperMetaGrid paper={paper} />

      <Card className="p-4">
        <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-3" style={{ color: C.ink300 }}>
          Question {idx + 1} of {total}
        </p>
        <QuestionPalette total={total} current={idx} onJump={goto} />
      </Card>

      {qs.paperType === "Objective"
        ? <MCQReviewCard key={qs.questions[idx].id} q={qs.questions[idx]} />
        : <SubjectiveReviewCard key={qs.questions[idx].id} q={qs.questions[idx]} />
      }

      <div className="flex gap-2.5">
        <button onClick={() => goto(idx - 1)} disabled={idx === 0}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold border transition-all disabled:opacity-40"
          style={{ borderColor: C.border, color: C.ink700, background: "#fff" }}>← Previous</button>
        <button onClick={() => goto(idx + 1)} disabled={idx === total - 1}
          className="flex-1 py-2.5 rounded-xl text-[13px] font-semibold text-white hover:brightness-110 disabled:opacity-40 transition-all"
          style={{ background: G.brand }}>Next →</button>
      </div>
    </div>
  );
}

function PastPapersScreen({ selection }: { selection: Selection }) {
  const [board, setBoard]         = useState<BoardId>(selection.board ?? "punjab");
  const [classId, setClassId]     = useState(selection.classId ?? "10");
  const [subject, setSubject]     = useState<SubjectId>(selection.subjects[0] ?? "math");
  const [year, setYear]           = useState<string>("all");
  const [paperType, setPaperType] = useState<string>("all");
  const [openPaper, setOpenPaper] = useState<PastPaper | null>(null);

  const papers = getPastPapers(board, classId, subject)
    .filter(p => year === "all" || String(p.year) === year)
    .filter(p => paperType === "all" || p.paperType === paperType);

  if (openPaper) {
    return <PastPaperViewer paper={openPaper} onBack={() => setOpenPaper(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.cyan }}><Icons.fileText size={16} /></div>
        <div>
          <h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Past Papers</h2>
          <p className="text-[12px]" style={{ color: C.ink300 }}>Past papers with structured questions, answers and topics.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Board" value={board} onChange={v => setBoard(v as BoardId)}
            options={BOARDS.map(b => ({ value: b.id, label: b.name }))} />
          <FilterSelect label="Class" value={classId} onChange={setClassId}
            options={CLASSES.map(c => ({ value: c.id, label: c.label }))} />
          <FilterSelect label="Subject" value={subject} onChange={v => setSubject(v as SubjectId)}
            options={SUBJECTS.map(s => ({ value: s.id, label: s.name }))} />
          <FilterSelect label="Paper Type" value={paperType} onChange={setPaperType}
            options={[{ value: "all", label: "Objective & Subjective" }, { value: "Objective", label: "Objective" }, { value: "Subjective", label: "Subjective" }]} />
          <FilterSelect label="Year" value={year} onChange={setYear}
            options={[{ value: "all", label: "All years" }, ...PAPER_YEARS.map(y => ({ value: String(y), label: String(y) }))]} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {papers.map(p => <PastPaperCard key={p.id} paper={p} onOpen={() => setOpenPaper(p)} />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   STUDY RESOURCES / NOTES SCREEN
═══════════════════════════════════════════════════════════════════════════ */
function NoteCard({ note }: { note: NoteResource }) {
  const [open, setOpen] = useState(false);
  return (
    <Card className="overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: C.tealSoft, color: C.teal }}>
          <Icons.book size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-[13px] truncate" style={{ color: C.ink900 }}>{note.topic}</p>
          <p className="text-[11px] mt-0.5" style={{ color: C.ink300 }}>{note.readMins} min read · Updated {note.updated}</p>
        </div>
        <span style={{ color: C.ink300, transform: open ? "rotate(90deg)" : undefined, transition: "transform .2s" }}>
          <Icons.chevron size={14} />
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5" style={{ borderTop: `1px solid ${C.border}` }}>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-wide pt-3" style={{ color: C.ink300 }}>What's covered</p>
          {note.points.map((pt, i) => (
            <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-xl" style={{ background: C.surf1 }}>
              <span className="mt-0.5" style={{ color: C.teal }}><Icons.check size={13} /></span>
              <span className="text-[12px]" style={{ color: C.ink700 }}>{pt}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function ResourcesScreen({ selection }: { selection: Selection }) {
  const [board, setBoard]     = useState<BoardId>(selection.board ?? "punjab");
  const [classId, setClassId] = useState(selection.classId ?? "10");
  const [subject, setSubject] = useState<SubjectId>(selection.subjects[0] ?? "math");

  const notes = getNotes(board, classId, subject);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.teal }}><Icons.folder size={16} /></div>
        <div>
          <h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>Study Resources</h2>
          <p className="text-[12px]" style={{ color: C.ink300 }}>Structured study notes for your board, class &amp; subject.</p>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <FilterSelect label="Board" value={board} onChange={v => setBoard(v as BoardId)}
            options={BOARDS.map(b => ({ value: b.id, label: b.name }))} />
          <FilterSelect label="Class" value={classId} onChange={setClassId}
            options={CLASSES.map(c => ({ value: c.id, label: c.label }))} />
          <FilterSelect label="Subject" value={subject} onChange={v => setSubject(v as SubjectId)}
            options={SUBJECTS.map(s => ({ value: s.id, label: s.name }))} />
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {notes.map(n => <NoteCard key={n.id} note={n} />)}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STUDENT AUTH SCREEN (Login / Sign Up)
════════════════════════════════════════════════════════════════════════ */
function AuthField({ label, type = "text", value, onChange, placeholder, autoComplete, right }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; autoComplete?: string; right?: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-mono font-semibold uppercase tracking-wide mb-1.5" style={{ color: C.ink300 }}>{label}</label>
      <div className="flex items-center gap-2 px-3.5 rounded-xl input-ring" style={{ background: C.card }}>
        <input
          className="flex-1 py-2.5 text-[13px] outline-none bg-transparent"
          type={type} value={value} placeholder={placeholder} autoComplete={autoComplete}
          onChange={e => onChange(e.target.value)}
          style={{ color: C.ink700 }} />
        {right}
      </div>
    </div>
  );
}

function AuthScreen({ onSuccess }: { onSuccess: (user: StudentUser) => void }) {
  const [mode, setMode]         = useState<"login" | "signup">("login");
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const switchMode = (m: "login" | "signup") => {
    setMode(m);
    setError("");
    setPassword("");
    setConfirm("");
    setShowPw(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    const res = mode === "login"
      ? await login(email, password)
      : await signUp(name, email, password, confirm);
    setBusy(false);
    if (res.ok) onSuccess(res.user);
    else setError(res.error);
  };

  const isLogin = mode === "login";

  return (
    <div className="fixed inset-0 overflow-y-auto flex items-center justify-center p-4"
      style={{ background: G.hero }}>
      {/* Star field + glow accents */}
      {[[8,14],[22,9],[38,18],[55,10],[70,24],[86,13],[15,40],[80,44],[50,7],[65,36]].map(([x,y],i)=>(
        <div key={i} className="absolute w-1 h-1 rounded-full bg-white pointer-events-none"
          style={{ left: `${x}%`, top: `${y}%`, opacity: 0.25 + (i % 3) * 0.2 }} />
      ))}
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(91,95,239,0.22) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(0,207,237,0.16) 0%, transparent 70%)" }} />

      <div className="relative w-full max-w-md rounded-2xl bg-white overflow-hidden shadow-modal anim-scale-in">
        {/* Header */}
        <div className="p-6 pb-5" style={{ background: G.hero }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: G.cyan }}>
              <Icons.sparkle size={15} />
            </div>
            <div>
              <p className="font-display font-bold text-[15px] leading-none text-white">Mentora AI</p>
              <p className="text-[10px] font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Your AI Learning Mentor</p>
            </div>
          </div>
          <h2 className="font-display font-bold text-[19px] text-white mt-4">
            {isLogin ? "Welcome back" : "Create your student account"}
          </h2>
          <p className="text-[12px] mt-1" style={{ color: "rgba(255,255,255,0.55)" }}>
            {isLogin
              ? "Log in to pick up right where you left off."
              : "Keep your tests, mistakes & progress linked to your own account."}
          </p>

          {/* Mode toggle */}
          <div className="flex gap-1.5 mt-4 p-1 rounded-xl" style={{ background: "rgba(255,255,255,0.08)" }}>
            {(["login", "signup"] as const).map(m => (
              <button key={m} type="button" onClick={() => switchMode(m)}
                className="flex-1 py-2 rounded-lg text-[12px] font-semibold transition-all"
                style={{
                  background: mode === m ? "rgba(255,255,255,0.12)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,0.5)",
                }}>
                {m === "login" ? "Login" : "Sign Up"}
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={submit} className="p-6 space-y-4">
          {!isLogin && (
            <AuthField label="Full name" value={name} onChange={setName} placeholder="e.g. Ali Hassan" autoComplete="name" />
          )}
          <AuthField label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
          <AuthField label="Password" type={showPw ? "text" : "password"} value={password} onChange={setPassword}
            placeholder={isLogin ? "Your password" : "At least 6 characters"} autoComplete={isLogin ? "current-password" : "new-password"}
            right={
              <button type="button" onClick={() => setShowPw(s => !s)} className="p-1 rounded-lg flex-shrink-0" style={{ color: C.ink300 }}>
                {showPw ? <Icons.eyeOff size={15} /> : <Icons.eye size={15} />}
              </button>
            } />
          {!isLogin && (
            <AuthField label="Confirm password" type={showPw ? "text" : "password"} value={confirm} onChange={setConfirm}
              placeholder="Re-enter your password" autoComplete="new-password" />
          )}

          {error && (
            <div className="flex items-start gap-2 px-3.5 py-2.5 rounded-xl" style={{ background: C.roseSoft }}>
              <span className="mt-0.5 flex-shrink-0" style={{ color: C.rose }}><Icons.alert size={14} /></span>
              <p className="text-[12px]" style={{ color: C.rose }}>{error}</p>
            </div>
          )}

          <button type="submit" disabled={busy}
            className="w-full py-3 rounded-xl text-[13px] font-semibold text-white transition-all hover:brightness-110 active:scale-[.98] disabled:opacity-60"
            style={{ background: G.brand }}>
            {busy ? "Please wait…" : isLogin ? "Log in" : "Create account"}
          </button>

          <p className="text-center text-[12px]" style={{ color: C.ink300 }}>
            {isLogin ? "New to Mentora AI? " : "Already have an account? "}
            <button type="button" onClick={() => switchMode(isLogin ? "signup" : "login")}
              className="font-semibold" style={{ color: C.brand }}>
              {isLogin ? "Sign up" : "Log in"}
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   STUDENT PROFILE SCREEN
════════════════════════════════════════════════════════════════════════ */
function ProfileScreen({ user, selection, onEditSelection, onLogout, onUserUpdated }: {
  user: StudentUser; selection: Selection;
  onEditSelection: () => void; onLogout: () => void; onUserUpdated: (u: StudentUser) => void;
}) {
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft]   = useState(user.name);
  const [nameError, setNameError]  = useState("");

  /* This student's saved results — the same data that powers Mistakes & Progress */
  const results        = loadAssessmentResults(user.id);
  const totalTests      = results.length;
  const totalQuestions  = results.reduce((sum, r) => sum + r.total, 0);
  const totalCorrect    = results.reduce((sum, r) => sum + r.correctCount, 0);
  const overallPct      = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const board = BOARDS.find(b => b.id === selection.board);
  const cls   = CLASSES.find(c => c.id === selection.classId);
  const joined = new Date(user.createdAt);
  const joinedLabel = isNaN(joined.getTime()) ? "" : joined.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const saveName = () => {
    const res = updateUserName(user.id, nameDraft);
    if (res.ok) {
      onUserUpdated(res.user);
      setEditingName(false);
      setNameError("");
    } else {
      setNameError(res.error);
    }
  };

  const STATS = [
    { label: "Tests & Practice",   val: String(totalTests),  Icon: Icons.clipboard, color: C.brand,   bg: C.brandSoft   },
    { label: "Questions Attempted", val: String(totalQuestions), Icon: Icons.book, color: C.cyan,    bg: C.cyanSoft    },
    { label: "Overall Score",      val: totalQuestions > 0 ? `${overallPct}%` : "—", Icon: Icons.target, color: C.emerald, bg: C.emeraldSoft },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: G.brand }}><Icons.user size={16} /></div>
        <div>
          <h2 className="font-display font-bold text-[16px]" style={{ color: C.ink900 }}>My Profile</h2>
          <p className="text-[12px]" style={{ color: C.ink300 }}>Your account and everything linked to it</p>
        </div>
      </div>

      {/* Identity card */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Avatar name={user.name} size={72} />
          <div className="flex-1 min-w-0">
            {editingName ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input value={nameDraft} onChange={e => setNameDraft(e.target.value)} maxLength={60} autoFocus
                    className="flex-1 min-w-0 px-3 py-2 rounded-xl text-[14px] font-semibold font-display outline-none input-ring"
                    style={{ color: C.ink900, background: C.card }} />
                  <button onClick={saveName} className="flex-shrink-0 px-3 py-2 rounded-xl text-[12px] font-semibold text-white transition-all hover:brightness-110"
                    style={{ background: G.brand }}>Save</button>
                  <button onClick={() => { setEditingName(false); setNameDraft(user.name); setNameError(""); }}
                    className="flex-shrink-0 px-3 py-2 rounded-xl text-[12px] font-semibold"
                    style={{ border: `1px solid ${C.border}`, color: C.ink500 }}>Cancel</button>
                </div>
                {nameError && <p className="text-[12px]" style={{ color: C.rose }}>{nameError}</p>}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <p className="font-display font-bold text-[20px] truncate" style={{ color: C.ink900 }}>{user.name}</p>
                <button onClick={() => { setEditingName(true); setNameDraft(user.name); }} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: C.ink300 }} title="Edit name">
                  <Icons.edit size={13} />
                </button>
              </div>
            )}
            <p className="text-[13px] mt-0.5" style={{ color: C.ink500 }}>{user.email}</p>
            {joinedLabel && (
              <p className="text-[11px] mt-1 flex items-center gap-1.5" style={{ color: C.ink300 }}>
                <Icons.star size={11} /> Student since {joinedLabel}
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Academic info */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display font-bold text-[15px]" style={{ color: C.ink900 }}>Board, Class & Subjects</h3>
          <button onClick={onEditSelection}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-all hover:brightness-110"
            style={{ background: G.brand }}>
            <Icons.edit size={11} /> Edit
          </button>
        </div>
        <div className="space-y-2.5">
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl" style={{ background: C.surf1 }}>
            <span className="text-[12px] font-medium flex items-center gap-2" style={{ color: C.ink500 }}><Icons.layers size={13} /> Board</span>
            <span className="text-[13px] font-semibold" style={{ color: C.ink700 }}>{board?.name ?? "Not set"}</span>
          </div>
          <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl" style={{ background: C.surf1 }}>
            <span className="text-[12px] font-medium flex items-center gap-2" style={{ color: C.ink500 }}><Icons.grid size={13} /> Class</span>
            <span className="text-[13px] font-semibold" style={{ color: C.ink700 }}>{cls?.label ?? "Not set"}</span>
          </div>
          <div className="px-3.5 py-2.5 rounded-xl" style={{ background: C.surf1 }}>
            <span className="text-[12px] font-medium flex items-center gap-2" style={{ color: C.ink500 }}><Icons.book size={13} /> Subjects</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(selection.subjects.length ? selection.subjects : DEFAULT_SELECTION.subjects).map(id => {
                const s = SUBJECTS.find(x => x.id === id);
                if (!s) return null;
                return (
                  <span key={id} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: C.brandSoft, color: C.brand }}>{s.name}</span>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Learning stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {STATS.map(s => (
          <Card key={s.label} className="p-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: s.bg, color: s.color }}><s.Icon size={15} /></div>
            <p className="font-display font-bold text-[24px] leading-none" style={{ color: C.ink900 }}>{s.val}</p>
            <p className="text-[12px] font-medium mt-1" style={{ color: C.ink500 }}>{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Account actions */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <p className="text-[13px] font-semibold" style={{ color: C.ink700 }}>Log out of this device</p>
            <p className="text-[11px] mt-0.5" style={{ color: C.ink300 }}>You'll need your email and password to log back in.</p>
          </div>
          <button onClick={onLogout}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold transition-all hover:brightness-110 flex-shrink-0"
            style={{ background: C.roseSoft, color: C.rose }}>
            <Icons.logout size={14} /> Log out
          </button>
        </div>
      </Card>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   UPGRADE TO PRO — premium preview
   Preview only: institute notes, video lectures and photos are announced as
   coming later; no premium content or payment flow exists yet.
═══════════════════════════════════════════════════════════════════════════ */
function VideoIcon({ size = 18 }: IP = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="14" height="14" rx="2.5" />
      <path d="m16 10 5-3v10l-5-3" />
    </svg>
  );
}

function PhotoIcon({ size = 18 }: IP = {}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <circle cx="9" cy="9" r="1.8" />
      <path d="m21 15-4.5-4.5L7 20" />
    </svg>
  );
}

const PRO_UPCOMING = [
  {
    Icon: Icons.book,
    bg: C.brandSoft, color: C.brand,
    title: "Institute Notes",
    desc: "Chapter-wise notes prepared by your institute's teachers — exactly the handouts used in your classroom, organized by board, class and subject.",
  },
  {
    Icon: VideoIcon,
    bg: C.cyanSoft, color: C.cyan,
    title: "Video Lectures",
    desc: "Topic-wise recorded video lectures from your teachers, so you can rewatch any lesson as many times as you need before exams.",
  },
  {
    Icon: PhotoIcon,
    bg: C.tealSoft, color: C.teal,
    title: "Photos & Scans",
    desc: "Whiteboard photos, solved-exercise scans and lab practical snapshots shared by your institute, right inside each topic.",
  },
] as const;

const PRO_FREE_FOREVER = [
  "AI Mentor — ask anything, any time",
  "Assessments & targeted Practice sessions",
  "Past papers with model answers",
  "Study notes & Mistake Analyzer",
];

function ProScreen() {
  return (
    <div className="space-y-4 max-w-3xl">

      {/* Hero banner */}
      <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8" style={{ background: G.upgrade }}>
        <div className="absolute right-4 top-4 opacity-30 pointer-events-none"><Icons.sparkle size={64} /></div>
        <div className="absolute right-20 bottom-2 opacity-20 pointer-events-none"><Icons.star size={40} /></div>
        <div className="relative flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}>
            <Icons.star size={22} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 className="font-display font-bold text-[24px] text-white leading-none">Mentora Pro</h2>
              <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-widest text-white"
                style={{ background: "rgba(255,255,255,0.22)" }}>Coming Soon</span>
            </div>
            <p className="text-[13px] leading-relaxed mt-2 max-w-md" style={{ color: "rgba(255,255,255,0.85)" }}>
              A premium layer of learning on top of everything you already use. Here's a first look at what your institute will be able to share with you.
            </p>
          </div>
        </div>
      </div>

      {/* Upcoming premium content */}
      <div>
        <p className="text-[11px] font-mono font-semibold uppercase tracking-widest mb-2.5" style={{ color: C.ink300 }}>
          Coming to Pro — added later
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PRO_UPCOMING.map(({ Icon, bg, color, title, desc }) => (
            <Card key={title} className="p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg, color }}>
                  <Icon size={17} />
                </div>
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold"
                  style={{ background: C.amberSoft, color: C.amber }}>
                  <Icons.lock size={10} /> Coming later
                </span>
              </div>
              <p className="font-display font-bold text-[13px] mb-1" style={{ color: C.ink900 }}>{title}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: C.ink500 }}>{desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* Free tier reassurance */}
      <Card className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: C.emeraldSoft, color: C.emerald }}>
            <Icons.check size={17} />
          </div>
          <div>
            <p className="font-display font-bold text-[14px]" style={{ color: C.ink900 }}>Everything you use today stays free</p>
            <p className="text-[12px] mt-0.5" style={{ color: C.ink500 }}>Pro only adds new content from your institute — nothing moves behind a paywall.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PRO_FREE_FOREVER.map(item => (
            <div key={item} className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl" style={{ background: C.surf1 }}>
              <span className="flex-shrink-0" style={{ color: C.emerald }}><Icons.check size={13} /></span>
              <span className="text-[12px] font-medium" style={{ color: C.ink700 }}>{item}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Footnote */}
      <p className="text-[11px] text-center pt-1" style={{ color: C.ink300 }}>
        This is a preview — institute notes, videos and photos are not available yet and will be added in a later update.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP SHELL
═══════════════════════════════════════════════════════════════════════════ */
export default function App() {
  /* Logged-in student — session is persisted, so login survives refreshes */
  const [user, setUser] = useState<StudentUser | null>(() => getCurrentUser());
  const userId = user?.id ?? null;

  const [screen, setScreen] = useState<Screen>("dashboard");
  const [mobileOpen, setMobile] = useState(false);
  const isMentor = screen === "mentor";
  const isDash   = screen === "dashboard";

  /* Board · Class · Subjects selection (persisted per student) */
  const [selection, setSelection] = useState<Selection>(() => loadSelection(userId) ?? DEFAULT_SELECTION);
  const [setupOpen, setSetupOpen] = useState(() => userId !== null && loadSelection(userId) === null);

  /* "Practice this weak topic" hand-off from Progress / Mistake Analyzer → Practice */
  const [practiceTarget, setPracticeTarget] = useState<{ subject: SubjectId; topic: string } | null>(null);
  const startPractice = (subject: SubjectId, topic: string) => {
    setPracticeTarget({ subject, topic });
    setScreen("practice");
  };

  /* Reload account-scoped data whenever the signed-in student changes
     (first login, switching accounts, or a page refresh) */
  useEffect(() => {
    if (userId === null) return;
    const saved = loadSelection(userId);
    setSelection(saved ?? DEFAULT_SELECTION);
    setSetupOpen(saved === null);
    setScreen("dashboard");
    setPracticeTarget(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const handleSaveSelection = (sel: Selection) => {
    setSelection(sel);
    saveSelection(sel, userId);
    setSetupOpen(false);
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setMobile(false);
    setPracticeTarget(null);
  };

  /* Auth gate — students must be logged in to use the app */
  if (user === null) {
    return <AuthScreen onSuccess={setUser} />;
  }

  return (
    <div className="mentor-root flex h-screen overflow-hidden" style={{ background: C.bg }}>
      {/* Board/Class/Subjects setup modal — shown on a student's first login, or when reopened */}
      {setupOpen && (
        <BoardSetupModal
          initial={selection}
          onSave={handleSaveSelection}
          onClose={() => setSetupOpen(false)}
          dismissable={loadSelection(userId) !== null}
        />
      )}

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-col w-[230px] flex-shrink-0 h-full">
        <Sidebar active={screen} onChange={setScreen} />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 md:hidden" style={{ background: "rgba(8,13,39,0.6)" }}
            onClick={() => setMobile(false)} />
          <div className="fixed left-0 top-0 h-full w-[230px] z-50 md:hidden">
            <Sidebar active={screen} onChange={setScreen} mobile onClose={() => setMobile(false)} />
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {isDash ? (
          /* Dashboard has its own inline header */
          <div className="flex-shrink-0 bg-white" style={{ borderBottom: `1px solid ${C.border}` }}>
            <DashboardHeader onMenuClick={() => setMobile(true)} selection={selection} onChangeSelection={() => setSetupOpen(true)} user={user} onProfile={() => setScreen("profile")} userId={userId} />
          </div>
        ) : (
          <TopBar screen={screen} onMenuClick={() => setMobile(true)} selection={selection} onChangeSelection={() => setSetupOpen(true)} user={user} onProfile={() => setScreen("profile")} />
        )}

        <main key={screen} className={`flex-1 overflow-y-auto ${isMentor ? "flex flex-col" : ""}`}
          style={{ background: isDash ? C.surf1 : C.bg, animation: "pageEnter .36s ease both" }}>
          {isMentor ? (
            <div className="mentor-inner flex-1 flex flex-col p-6 h-full"><MentorScreen user={user} selection={selection} /></div>
          ) : (
            <div className="p-6">
              {screen === "dashboard"  && <DashboardScreen onNav={setScreen} onPractice={startPractice} selection={selection} userName={user.name} userId={userId} />}
              {screen === "assessment" && <AssessmentScreen selection={selection} userId={userId} />}
              {screen === "practice"   && <PracticeScreen selection={selection} target={practiceTarget} userId={userId} />}
              {screen === "papers"     && <PastPapersScreen selection={selection} />}
              {screen === "resources"  && <ResourcesScreen selection={selection} />}
              {screen === "mistake"    && <MistakeScreen onNav={setScreen} onPractice={startPractice} userId={userId} />}
              {screen === "progress"   && <ProgressScreen onNav={setScreen} onPractice={startPractice} userId={userId} selection={selection} />}
              {screen === "profile"    && <ProfileScreen user={user} selection={selection} onEditSelection={() => setSetupOpen(true)} onLogout={handleLogout} onUserUpdated={setUser} />}
              {screen === "pro"        && <ProScreen />}
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes pageEnter { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp    { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes dotBlink  { 0%,80%,100% { transform:scale(.7); opacity:.4; } 40% { transform:scale(1); opacity:1; } }
        .shadow-card { box-shadow: 0 1px 3px rgba(11,15,46,.05), 0 3px 10px rgba(91,95,239,.06); }
        * { scrollbar-width:thin; scrollbar-color:transparent transparent; }
        *:hover { scrollbar-color:rgba(139,144,179,.3) transparent; }
      `}</style>
    </div>
  );
}
