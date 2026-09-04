/* ═══════════════════════════════════════════════════════════════════════════
   MENTORA AI — STUDENT ACCOUNTS (client-side, localStorage-backed)
   Simple & reliable for the React + Vite prototype: no server required.
   • Passwords are salted + hashed (SHA-256 via Web Crypto where available).
   • The session lives in localStorage, so students stay logged in across
     refreshes and browser restarts.
   • Per-student data (selection, results) is stored by data.ts under
     namespaced keys, so each account keeps its own Tests, Mistakes &
     Progress.
   Swap this module for a real backend (Firebase/Supabase) later — the UI
   only depends on this small API surface.
═══════════════════════════════════════════════════════════════════════════ */
import { migrateLegacyDataIfNeeded } from "./data";

export type StudentUser = {
  id: string;
  name: string;
  email: string;      // lowercase, normalized
  passwordHash: string;
  createdAt: string;  // ISO timestamp
};

export type AuthResult =
  | { ok: true; user: StudentUser }
  | { ok: false; error: string };

const USERS_KEY = "mentora.users.v1";
const SESSION_KEY = "mentora.session.v1";

/* ── storage helpers ─────────────────────────────────────────────────────── */
function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
}

function readUsers(): StudentUser[] {
  const users = readJSON<unknown>(USERS_KEY, []);
  if (!Array.isArray(users)) return [];
  return users.filter((u): u is StudentUser =>
    !!u && typeof (u as StudentUser).id === "string" && typeof (u as StudentUser).email === "string"
  );
}

function saveUsers(users: StudentUser[]): void {
  writeJSON(USERS_KEY, users);
}

function startSession(userId: string): void {
  writeJSON(SESSION_KEY, { userId, loginAt: new Date().toISOString() });
}

/* ── password hashing ──────────────────────────────────────────────────────
   Salted with the (normalized) email so two students with the same password
   get different hashes. SHA-256 via Web Crypto in secure contexts (localhost
   / HTTPS); a deterministic fallback elsewhere (e.g. LAN IP over HTTP).
   Login accepts either algorithm so accounts stay portable between contexts. */
async function sha256Hex(text: string): Promise<string | null> {
  try {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

function fallbackHash(text: string): string {
  // FNV-1a inspired two-lane spread — demo-grade one-way digest for
  // non-secure contexts only.
  let h1 = 0x811c9dc5, h2 = 0xdeadbeef;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
    h2 = (Math.imul(h2 ^ c, 2654435761) + i) >>> 0;
  }
  return `fb1-${h1.toString(16)}-${h2.toString(16)}-${text.length.toString(16)}`;
}

function hashInput(salt: string, password: string): string {
  return `mentora:${salt}:${password}`;
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const input = hashInput(salt, password);
  return (await sha256Hex(input)) ?? fallbackHash(input);
}

async function passwordMatches(password: string, salt: string, storedHash: string): Promise<boolean> {
  const input = hashInput(salt, password);
  const sha = await sha256Hex(input);
  if (sha !== null && sha === storedHash) return true;
  return fallbackHash(input) === storedHash;
}

/* ── validation ──────────────────────────────────────────────────────────── */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function makeUserId(): string {
  return `u_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

/* ── API ─────────────────────────────────────────────────────────────────── */
export async function signUp(name: string, email: string, password: string, confirmPassword: string): Promise<AuthResult> {
  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 2) return { ok: false, error: "Please enter your full name (at least 2 characters)." };
  if (!EMAIL_RE.test(cleanEmail)) return { ok: false, error: "Please enter a valid email address." };
  if (password.length < 6) return { ok: false, error: "Password must be at least 6 characters." };
  if (password !== confirmPassword) return { ok: false, error: "Passwords do not match." };

  const users = readUsers();
  if (users.some(u => u.email === cleanEmail)) {
    return { ok: false, error: "An account with this email already exists. Try logging in instead." };
  }

  const user: StudentUser = {
    id: makeUserId(),
    name: cleanName,
    email: cleanEmail,
    passwordHash: await hashPassword(password, cleanEmail),
    createdAt: new Date().toISOString(),
  };
  saveUsers([...users, user]);
  startSession(user.id);

  // First student to sign in keeps any data saved before accounts existed.
  migrateLegacyDataIfNeeded(user.id);
  return { ok: true, user };
}

export async function login(email: string, password: string): Promise<AuthResult> {
  const cleanEmail = email.trim().toLowerCase();
  if (!EMAIL_RE.test(cleanEmail)) return { ok: false, error: "Please enter a valid email address." };
  if (!password) return { ok: false, error: "Please enter your password." };

  const user = readUsers().find(u => u.email === cleanEmail);
  if (!user) return { ok: false, error: "No account found with this email. Create one below." };
  if (!(await passwordMatches(password, user.email, user.passwordHash))) {
    return { ok: false, error: "Incorrect password. Please try again." };
  }

  startSession(user.id);
  // Covers the case where the app was used anonymously before accounts existed.
  migrateLegacyDataIfNeeded(user.id);
  return { ok: true, user };
}

export function logout(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}

/** Returns the logged-in student, or null when signed out. Reads the saved
    session, so login survives page refreshes. */
export function getCurrentUser(): StudentUser | null {
  const session = readJSON<{ userId?: unknown } | null>(SESSION_KEY, null);
  if (!session || typeof session.userId !== "string") return null;
  return readUsers().find(u => u.id === session.userId) ?? null;
}

export function updateUserName(userId: string, name: string): AuthResult {
  const cleanName = name.trim();
  if (cleanName.length < 2) return { ok: false, error: "Please enter your full name (at least 2 characters)." };

  const users = readUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return { ok: false, error: "Account not found." };

  const updated: StudentUser = { ...users[idx], name: cleanName };
  users[idx] = updated;
  saveUsers(users);
  return { ok: true, user: updated };
}
