"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

type AutoSaveStatus = "idle" | "saving" | "saved" | "error";

const AUTO_SAVE_DEBOUNCE_MS = 1000;
const SAVED_DISPLAY_MS = 2000;
const TOAST_ID = "auto-save";

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<unknown>;
  enabled?: boolean;
  debounceMs?: number;
}

export function useAutoSave<T>({
  data,
  onSave,
  enabled = true,
  debounceMs = AUTO_SAVE_DEBOUNCE_MS,
}: UseAutoSaveOptions<T>) {
  const [status, setStatus] = useState<AutoSaveStatus>("idle");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const serialized = JSON.stringify(data);

    // Skip if nothing changed from last saved state
    if (serialized === lastSavedRef.current) return;

    // Skip initial empty state
    if (lastSavedRef.current === "") {
      lastSavedRef.current = serialized;
      return;
    }

    cancel();

    timerRef.current = setTimeout(async () => {
      setStatus("saving");
      toast.loading("Saving...", { id: TOAST_ID });

      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }

      try {
        await onSaveRef.current(data);
        lastSavedRef.current = serialized;
        setStatus("saved");
        toast.success("Saved", { id: TOAST_ID, duration: SAVED_DISPLAY_MS });

        savedTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, SAVED_DISPLAY_MS);
      } catch {
        setStatus("error");
        toast.error("Save failed", { id: TOAST_ID });
      }
    }, debounceMs);

    return cancel;
  }, [data, enabled, debounceMs, cancel]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancel();
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
      }
    };
  }, [cancel]);

  // Force save immediately (for import, etc.)
  const saveNow = useCallback(
    async (overrideData?: T) => {
      cancel();
      const toSave = overrideData ?? data;
      setStatus("saving");
      toast.loading("Saving...", { id: TOAST_ID });

      try {
        await onSaveRef.current(toSave);
        lastSavedRef.current = JSON.stringify(toSave);
        setStatus("saved");
        toast.success("Saved", { id: TOAST_ID, duration: SAVED_DISPLAY_MS });

        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => {
          setStatus("idle");
        }, SAVED_DISPLAY_MS);
      } catch {
        setStatus("error");
        toast.error("Save failed", { id: TOAST_ID });
      }
    },
    [data, cancel],
  );

  return { status, saveNow };
}
