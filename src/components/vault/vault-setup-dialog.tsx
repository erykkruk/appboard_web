"use client";

import { Loader2, ShieldCheck } from "lucide-react";
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
import { buildSetupPayload } from "@/lib/vault-crypto";

const MIN_LENGTH = 8;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: () => Promise<void> | void;
}

export function VaultSetupDialog({ open, onOpenChange, onDone }: Props) {
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (passphrase.length < MIN_LENGTH) {
      setError(`Passphrase must be at least ${MIN_LENGTH} characters.`);
      return;
    }
    if (passphrase !== confirm) {
      setError("Passphrases do not match.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = await buildSetupPayload(passphrase);
      const { migrated } = await api.vault.setup(payload);
      setPassphrase("");
      setConfirm("");
      await onDone();
      onOpenChange(false);
      toast.success(
        migrated > 0
          ? `Encryption enabled — ${migrated} store credential(s) re-encrypted`
          : "Encryption enabled",
      );
    } catch {
      setError("Failed to enable encryption. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Enable end-to-end encryption
          </DialogTitle>
          <DialogDescription>
            Your store credentials will be encrypted with a key derived from this
            passphrase. It never leaves your browser, and the server can only
            decrypt credentials while you are unlocked in an active session.
            There is no recovery — if you forget it, reset the vault and
            re-upload your credentials.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vault-pass">Passphrase</Label>
            <Input
              id="vault-pass"
              type="password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vault-pass-confirm">Confirm passphrase</Label>
            <Input
              id="vault-pass-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enable encryption
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
