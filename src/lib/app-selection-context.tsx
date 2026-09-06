"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

/**
 * A multi-select is a task ("apply this to those five apps"), not a user
 * preference, so it lives in sessionStorage and dies with the tab. The
 * localStorage keys owned by the sidebar are deliberately untouched.
 */
const STORAGE_KEY = "appboard:app-selection";

export interface AppSelectionValue {
  selectedIds: Set<string>;
  sourceAppId: string | null;
  toggle: (id: string) => void;
  selectAll: (ids: string[]) => void;
  clear: () => void;
  setSource: (id: string | null) => void;
}

interface SelectionSnapshot {
  selectedIds: Set<string>;
  sourceAppId: string | null;
}

interface PersistedSelection {
  selectedIds: string[];
  sourceAppId: string | null;
}

const EMPTY_SNAPSHOT: SelectionSnapshot = {
  selectedIds: new Set<string>(),
  sourceAppId: null,
};

function readPersistedSelection(): SelectionSnapshot {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_SNAPSHOT;
    const parsed = JSON.parse(raw) as Partial<PersistedSelection>;
    return {
      selectedIds: new Set(
        Array.isArray(parsed.selectedIds)
          ? parsed.selectedIds.filter((id): id is string => typeof id === "string")
          : [],
      ),
      sourceAppId:
        typeof parsed.sourceAppId === "string" ? parsed.sourceAppId : null,
    };
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

/**
 * sessionStorage is an external store, so it is read through
 * useSyncExternalStore instead of a mount effect: the server render and the
 * hydration pass both see the empty snapshot, and React picks up the stored
 * one right after hydrating.
 */
function createSelectionStore() {
  const listeners = new Set<() => void>();
  let snapshot: SelectionSnapshot | null = null;

  const read = (): SelectionSnapshot => {
    if (!snapshot) snapshot = readPersistedSelection();
    return snapshot;
  };

  const write = (next: SelectionSnapshot) => {
    snapshot = next;
    try {
      const payload: PersistedSelection = {
        selectedIds: [...next.selectedIds],
        sourceAppId: next.sourceAppId,
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Persistence is a convenience here - never break the UI over it.
    }
    for (const listener of listeners) listener();
  };

  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: read,
    getServerSnapshot: () => EMPTY_SNAPSHOT,
    update(mutate: (current: SelectionSnapshot) => SelectionSnapshot) {
      write(mutate(read()));
    },
  };
}

const AppSelectionContext = createContext<AppSelectionValue | null>(null);

export function useAppSelection(): AppSelectionValue {
  const ctx = useContext(AppSelectionContext);
  if (!ctx) {
    throw new Error("useAppSelection must be used within AppSelectionProvider");
  }
  return ctx;
}

export function AppSelectionProvider({ children }: { children: ReactNode }) {
  const [store] = useState(createSelectionStore);
  const { selectedIds, sourceAppId } = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );

  const toggle = useCallback(
    (id: string) => {
      store.update((current) => {
        const next = new Set(current.selectedIds);
        if (!next.delete(id)) next.add(id);
        return { ...current, selectedIds: next };
      });
    },
    [store],
  );

  const selectAll = useCallback(
    (ids: string[]) => {
      store.update((current) => ({ ...current, selectedIds: new Set(ids) }));
    },
    [store],
  );

  // The source app only means something relative to a live selection, so it
  // goes away together with it.
  const clear = useCallback(() => {
    store.update(() => ({ selectedIds: new Set<string>(), sourceAppId: null }));
  }, [store]);

  const setSource = useCallback(
    (id: string | null) => {
      store.update((current) => ({ ...current, sourceAppId: id }));
    },
    [store],
  );

  const value = useMemo<AppSelectionValue>(
    () => ({ selectedIds, sourceAppId, toggle, selectAll, clear, setSource }),
    [selectedIds, sourceAppId, toggle, selectAll, clear, setSource],
  );

  return (
    <AppSelectionContext.Provider value={value}>
      {children}
    </AppSelectionContext.Provider>
  );
}
