"use client";

import { CheckCircle2, Loader2, RefreshCw, Unplug } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  useAppleAdsConnect,
  useAppleAdsDisconnect,
  useAppleAdsSetSource,
  useAppleAdsStatus,
  useAppleAdsSync,
} from "@/hooks/use-apple-ads";
import { KEYWORD_COUNTRIES } from "@/lib/keyword-research";

/**
 * Apple Ads (Search Ads) connection: unlocks Apple&apos;s OFFICIAL weekly search
 * popularity dataset as an alternative to the built-in estimate.
 */
export function AppleAdsSettingsCard() {
  const status = useAppleAdsStatus();
  const connect = useAppleAdsConnect();
  const disconnect = useAppleAdsDisconnect();
  const setSource = useAppleAdsSetSource();
  const sync = useAppleAdsSync();

  const [clientId, setClientId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [keyId, setKeyId] = useState("");
  const [privateKey, setPrivateKey] = useState("");
  const [syncCountry, setSyncCountry] = useState("us");

  const connected = status.data?.connected ?? false;
  const canConnect =
    clientId.trim() && teamId.trim() && keyId.trim() && privateKey.trim();

  async function handleConnect() {
    await connect.mutateAsync({
      clientId: clientId.trim(),
      keyId: keyId.trim(),
      privateKey: privateKey.trim(),
      teamId: teamId.trim(),
    });
    setClientId("");
    setTeamId("");
    setKeyId("");
    setPrivateKey("");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Apple Ads (official search popularity)
          {connected && (
            <Badge variant="outline" className="border-green-500/30 text-green-600 dark:text-green-400">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your free Apple Ads API key to replace the built-in
          popularity estimate with Apple&apos;s official weekly search popularity
          (1-100). Create the key under Apple Ads &gt; Account Settings &gt;
          API. Data syncs weekly per country.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!connected && (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Client ID</Label>
              <Input
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="SEARCHADS.xxxx"
              />
            </div>
            <div className="space-y-1">
              <Label>Team ID</Label>
              <Input
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                placeholder="SEARCHADS.xxxx"
              />
            </div>
            <div className="space-y-1">
              <Label>Key ID</Label>
              <Input
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder="uuid"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Private key (PEM)</Label>
              <Textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                placeholder="-----BEGIN PRIVATE KEY-----"
                rows={4}
                className="font-mono text-xs"
              />
            </div>
            <div>
              <Button
                onClick={handleConnect}
                disabled={!canConnect || connect.isPending}
              >
                {connect.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Connect
              </Button>
            </div>
          </div>
        )}

        {connected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">
                  Use Apple&apos;s official popularity
                </p>
                <p className="text-xs text-muted-foreground">
                  When on, keyword scoring uses Apple&apos;s values wherever the
                  term is in the weekly dataset; the estimate fills the gaps.
                </p>
              </div>
              <Switch
                checked={status.data?.source === "apple"}
                onCheckedChange={(checked) =>
                  setSource.mutate(checked ? "apple" : "internal")
                }
              />
            </div>

            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <Label>Sync country</Label>
                <Select value={syncCountry} onValueChange={setSyncCountry}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KEYWORD_COUNTRIES.map((c) => (
                      <SelectItem key={c.code} value={c.code}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                onClick={() => sync.mutate(syncCountry)}
                disabled={sync.isPending}
              >
                {sync.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Sync now
              </Button>
              <Button
                variant="ghost"
                onClick={() => disconnect.mutate()}
                disabled={disconnect.isPending}
              >
                <Unplug className="mr-2 h-4 w-4" />
                Disconnect
              </Button>
            </div>

            {(status.data?.activeWeeks.length ?? 0) > 0 && (
              <div className="text-xs text-muted-foreground">
                Synced datasets:{" "}
                {status.data?.activeWeeks
                  .map(
                    (w) =>
                      `${w.country.toUpperCase()} (week ${w.week}, ${w.termCount} terms)`,
                  )
                  .join(" · ")}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
