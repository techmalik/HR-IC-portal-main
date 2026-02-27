import { useCallback, useEffect, useRef, useState } from "react";

export type AutosaveStatus = "idle" | "unsaved" | "saving" | "saved" | "error";

interface UseAutosaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  initialData?: T; // Optional: the initial/loaded data to compare against
}

export function useAutosave<T>({
  data,
  onSave,
  debounceMs = 2000,
  enabled = true,
  initialData,
}: UseAutosaveOptions<T>) {
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>("");
  const isMountedRef = useRef(true);
  const pendingDataRef = useRef<T | null>(null);
  const isSavingRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const initialDataStringRef = useRef<string>("");

  const dataString = JSON.stringify(data);

  // Initialize lastSavedRef with initial data when provided, and reset when initialData changes
  useEffect(() => {
    if (initialData !== undefined) {
      const initialString = JSON.stringify(initialData);
      
      // Reset baseline when initialData changes (e.g., switching months)
      if (initialDataStringRef.current !== initialString) {
        initialDataStringRef.current = initialString;
        
        if (initialString !== "[]" && initialString !== "{}") {
          lastSavedRef.current = initialString;
          hasInitializedRef.current = true;
          setStatus("saved");
        } else {
          // Empty initial data - reset to allow first change to trigger save
          lastSavedRef.current = "";
          hasInitializedRef.current = false;
          setStatus("idle");
        }
      }
    }
  }, [initialData]);

  const save = useCallback(async (dataToSave: T) => {
    if (isSavingRef.current) {
      pendingDataRef.current = dataToSave;
      return;
    }

    isSavingRef.current = true;
    setStatus("saving");

    try {
      await onSave(dataToSave);
      if (isMountedRef.current) {
        lastSavedRef.current = JSON.stringify(dataToSave);
        hasInitializedRef.current = true;
        setStatus("saved");

        if (pendingDataRef.current) {
          const pending = pendingDataRef.current;
          pendingDataRef.current = null;
          isSavingRef.current = false;
          await save(pending);
        }
      }
    } catch {
      if (isMountedRef.current) {
        setStatus("error");
      }
    } finally {
      isSavingRef.current = false;
    }
  }, [onSave]);

  const triggerSave = useCallback(async () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    await save(data);
  }, [save, data]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Check if data has changed from last saved state
    const hasChanged = dataString !== lastSavedRef.current;
    const hasData = dataString !== "[]" && dataString !== "{}";
    
    if (hasChanged && hasData) {
      setStatus("unsaved");

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        save(data);
      }, debounceMs);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [dataString, debounceMs, enabled, save, data]);

  return {
    status,
    triggerSave,
    isSaving: status === "saving",
    isUnsaved: status === "unsaved",
    isSaved: status === "saved",
    isError: status === "error",
  };
}
