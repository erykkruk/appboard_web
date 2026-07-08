"use client";

import { KeyRound, Loader2, Lock, LockOpen, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { rewrapForNewPassphrase } from "@/lib/vault-crypto";
import { VaultSetupDialog } from "./vault-setup-dialog";
import { useVault } from "./vault-provider";

function ChangePassphraseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (next.length < 8) return setError("New passphrase must be at least 8 characters.");
    if (next !== confirm) return setError("New passphrases do not match.");
    setLoading(true);
    setError(null);
    try {
      const params = await api.vault.params();
      const rewrapped = await rewrapForNewPassphrase(current, next, params);
      await api.vault.changePassphrase(rewrapped);
      setCurrent("");
      setNext("");
      setConfirm("");
      onOpenChange(false);
      toast.success("Passphrase changed");
    } catch {
      setError("Could not change passphrase. Check your current passphrase.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change vault passphrase</DialogTitle>
          <DialogDescription>
            Re-wraps the same encryption key under a new passphrase. Your stored
            credentials are not re-encrypted.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cp-current">Current passphrase</Label>
            <Input
              id="cp-current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-next">New passphrase</Label>
            <Input
              id="cp-next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cp-confirm">Confirm new passphrase</Label>
            <Input
              id="cp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
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
            Change passphrase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VaultSettingsCard() {
  const { exists, unlocked, isLoading, lock, reset, refresh, requestUnlock } =
    useVault();
  const [setupOpen, setSetupOpen] = useState(false);
  const [changeOpen, setChangeOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const withBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Encryption Vault
        </CardTitle>
        <CardDescription>
          End-to-end encrypt your store credentials with a passphrase only you
          know. Even a stolen database cannot decrypt them.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-10" />
        ) : exists ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              {unlocked ? (
                <Badge className="gap-1">
                  <LockOpen className="h-3 w-3" /> Unlocked
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" /> Locked
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {unlocked ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={busy}
                    onClick={() => withBusy(lock)}
                  >
                    <Lock className="mr-2 h-4 w-4" /> Lock now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setChangeOpen(true)}
                  >
                    <KeyRound className="mr-2 h-4 w-4" /> Change passphrase
                  </Button>
                </>
              ) : (
                <Button variant="outline" size="sm" onClick={requestUnlock}>
                  <LockOpen className="mr-2 h-4 w-4" /> Unlock
                </Button>
              )}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    Reset vault
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset the encryption vault?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently wipes the encrypted store credentials —
                      they cannot be recovered. Your stores will be disconnected
                      and you will need to re-upload their credentials. Use this
                      only if you have forgotten your passphrase.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => withBusy(reset)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Reset vault
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Encryption is not enabled for this workspace. Credentials are
              currently encrypted with the server key.
            </p>
            <Button onClick={() => setSetupOpen(true)}>
              <ShieldCheck className="mr-2 h-4 w-4" /> Enable encryption
            </Button>
          </div>
        )}
      </CardContent>

      <VaultSetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        onDone={refresh}
      />
      <ChangePassphraseDialog open={changeOpen} onOpenChange={setChangeOpen} />
    </Card>
  );
}
