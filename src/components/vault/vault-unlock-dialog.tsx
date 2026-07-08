"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";
import { deriveDekForUnlock } from "@/lib/vault-crypto";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlocked: () => Promise<void> | void;
  onReset: () => Promise<void> | void;
}

export function VaultUnlockDialog({
  open,
  onOpenChange,
  onUnlocked,
  onReset,
}: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const submit = async () => {
    if (!passphrase) return;
    setLoading(true);
    setError(null);
    try {
      const params = await api.vault.params();
      const dek = await deriveDekForUnlock(passphrase, params);
      await api.vault.unlock(dek);
      setPassphrase("");
      await onUnlocked();
      onOpenChange(false);
      toast.success("Vault unlocked");
    } catch {
      setError("Incorrect passphrase. Try again, or reset the vault.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Unlock encryption vault</DialogTitle>
          <DialogDescription>
            Enter your vault passphrase to decrypt store credentials for this
            session. The passphrase is processed in your browser and never sent
            to the server.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="vault-unlock-pass">Passphrase</Label>
          {/* biome-ignore lint/a11y/noAutofocus: unlock prompt should focus immediately */}
          <Input
            id="vault-unlock-pass"
            type="password"
            autoFocus
            value={passphrase}
            onChange={(e) => setPassphrase(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter className="sm:justify-between">
          {confirmReset ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                Wipes stored credentials.
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  await onReset();
                  setConfirmReset(false);
                  onOpenChange(false);
                }}
              >
                Reset vault
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => setConfirmReset(true)}
            >
              Forgot passphrase?
            </Button>
          )}
          <Button onClick={submit} disabled={loading || !passphrase}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Unlock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
