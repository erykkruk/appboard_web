"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { VaultSetupDialog } from "./vault-setup-dialog";
import { VaultUnlockDialog } from "./vault-unlock-dialog";

interface VaultContextValue {
  exists: boolean;
  unlocked: boolean;
  isLoading: boolean;
  refresh: () => Promise<void>;
  lock: () => Promise<void>;
  reset: () => Promise<void>;
  requestUnlock: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

export function useVault(): VaultContextValue {
  const ctx = useContext(VaultContext);
  if (!ctx) throw new Error("useVault must be used within VaultProvider");
  return ctx;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const status = useQuery({
    queryKey: ["vault", "status"],
    queryFn: () => api.vault.status(),
    staleTime: 60_000,
  });

  const exists = status.data?.exists ?? false;
  const unlocked = status.data?.unlocked ?? false;
  const [forceUnlock, setForceUnlock] = useState(false);

  const refresh = useCallback(async () => {
    await qc.invalidateQueries({ queryKey: ["vault", "status"] });
  }, [qc]);

  // Derived: prompt whenever the vault is locked, or a request hit a 423.
  const mustUnlock = !status.isLoading && exists && !unlocked;
  const unlockOpen = mustUnlock || forceUnlock;

  // A 423 from any request (api client) means the vault locked mid-session.
  useEffect(() => {
    const onLocked = () => setForceUnlock(true);
    window.addEventListener("vault-locked", onLocked);
    return () => window.removeEventListener("vault-locked", onLocked);
  }, []);

  // A 428 means store credentials were saved without a vault — set one up.
  const [setupOpen, setSetupOpen] = useState(false);
  useEffect(() => {
    const onRequired = () => setSetupOpen(true);
    window.addEventListener("vault-required", onRequired);
    return () => window.removeEventListener("vault-required", onRequired);
  }, []);

  const lock = useCallback(async () => {
    await api.vault.lock();
    await refresh();
    toast.success("Vault locked");
  }, [refresh]);

  const reset = useCallback(async () => {
    await api.vault.reset();
    await refresh();
    toast.success("Vault reset — reconnect your stores with fresh credentials");
  }, [refresh]);

  return (
    <VaultContext.Provider
      value={{
        exists,
        unlocked,
        isLoading: status.isLoading,
        refresh,
        lock,
        reset,
        requestUnlock: () => setForceUnlock(true),
      }}
    >
      {children}
      <VaultUnlockDialog
        open={unlockOpen}
        onOpenChange={(o) => {
          if (!o) setForceUnlock(false);
        }}
        onUnlocked={async () => {
          setForceUnlock(false);
          await refresh();
        }}
        onReset={reset}
      />
      <VaultSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onDone={async () => {
          setSetupOpen(false);
          await refresh();
          toast.success(
            "Vault ready — connect your store again to save credentials securely",
          );
        }}
      />
    </VaultContext.Provider>
  );
}
