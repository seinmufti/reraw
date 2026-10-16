import { useSyncExternalStore } from "react";

export type Lang = "en" | "ckb";

const STORAGE_KEY = "reraw-lang";

function readStored(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === "en" || v === "ckb") return v;
  } catch {
    /* storage blocked */
  }
  return "en";
}

let current: Lang = readStored();
const listeners = new Set<() => void>();

export function getLang(): Lang {
  return current;
}

export function setLang(next: Lang) {
  if (next === current) return;
  current = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* storage blocked */
  }
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Re-renders the caller when the language changes. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, getLang, getLang);
}
