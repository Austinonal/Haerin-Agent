// Heuristic only: catches common credential shapes so they are not saved to memory.
const PATTERNS: [RegExp, string][] = [
  [/AIza[0-9A-Za-z_-]{20,}/, 'Google API key'],
  [/\bsk-[A-Za-z0-9_-]{16,}/, 'API key'],
  [/\b(ghp|gho|github_pat|xox[bpas])_?[A-Za-z0-9_-]{16,}/, 'access token'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'private key'],
  [/\bbearer\s+[A-Za-z0-9._-]{16,}/i, 'bearer token'],
  [/(password|passwd|pwd|รหัสผ่าน|พาสเวิร์ด|api[ _-]?key|token|secret)\s*[:=]?\s*\S{4,}/i, 'password / key'],
  [/\b(?:\d[ -]?){13,19}\b/, 'card or ID number'],
  [/\b[A-Za-z0-9+/_-]{40,}\b/, 'long token'],
];

/** Returns a reason if the text looks like it contains a secret, else null. */
export function detectSecret(text: string): string | null {
  for (const [re, label] of PATTERNS) if (re.test(text)) return label;
  return null;
}
