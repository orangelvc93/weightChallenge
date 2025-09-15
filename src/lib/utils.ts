// src/lib/utils.ts
import type { WeighIn } from "../types";

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function clamp(n: number, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

export function progressColor(p: number) {
  return `hsl(${clamp(p) * 120}, 80%, 45%)`;
}

export function parseISO(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function nextMonday(from = new Date()) {
  const d = new Date(from);
  const day = d.getDay(); // 0 dom, 1 lun
  const diff = (1 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export const DEADLINE = new Date(new Date().getFullYear(), 11 - 1, 10); // 10-dic
export function isPastDeadline(date = new Date()) { return date > DEADLINE; }

export function computeProgress(start: number, goal: number, current: number) {
  if (start === goal) return 1;
  if (goal < start) return clamp((start - current) / (start - goal)); // bajar
  return clamp((current - start) / (goal - start));                    // subir
}

export function trendLabel(start: number, goal: number) {
  return goal === start ? "Mantener" : goal < start ? "Bajar" : "Subir";
}

export function mergeEntry(entries: WeighIn[], newEntry: WeighIn): WeighIn[] {
  const map = new Map(entries.map((e) => [e.date, e.weight]));
  map.set(newEntry.date, newEntry.weight);
  return Array.from(map.entries())
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => +parseISO(a.date) - +parseISO(b.date));
}
