import { useRef, MutableRefObject } from "react";

/**
 * Safe wrapper around useRef to handle potential initialization errors
 */
export function useSafeRef<T = undefined>(): MutableRefObject<T | null>;
export function useSafeRef<T>(initialValue: T): MutableRefObject<T>;
export function useSafeRef<T = undefined>(initialValue?: T): MutableRefObject<T | null> {
  try {
    return useRef<T | null>(initialValue ?? null);
  } catch (error) {
    console.warn("useRef error caught, returning fallback ref:", error);
    // Return a fallback ref-like object
    return { current: initialValue ?? null };
  }
}