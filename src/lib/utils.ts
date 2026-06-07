import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]): string {
  return clsx(inputs);
}

/** Estimated reading time in minutes (≈ 250 wpm). */
export function readingMinutes(words: number): number {
  return Math.max(1, Math.round(words / 250));
}

export function pluralize(n: number, word: string): string {
  return `${n.toLocaleString()} ${word}${n === 1 ? "" : "s"}`;
}

/** Local YYYY-MM-DD (not UTC) — important for day-boundary correctness. */
export function localDay(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const dbb = new Date(b + "T00:00:00");
  return Math.round((dbb.getTime() - da.getTime()) / 86_400_000);
}
