"use client";

import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateLocalApp } from "@/hooks/use-apps";

/**
 * Start an app that is not in any store yet. There is nothing to import and
 * nothing to audit, so this asks for the two things we genuinely need and
 * drops you straight into writing the listing.
 */
export function NewAppForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const createApp = useCreateLocalApp();
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState<"ios" | "android">("ios");

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Give the app a name first.");
      return;
    }
    try {
      const app = await createApp.mutateAsync({ name: name.trim(), platform });
      onCreated?.();
      router.push(`/apps/${app.id}/start`);
    } catch (err) {
      toast.error(
        err instanceof Error && err.message
          ? err.message
          : "Could not create the app",
      );
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="new-app-name">App name</Label>
        <Input
          id="new-app-name"
          value={name}
          placeholder="What are you building?"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="new-app-platform">Where will it ship first?</Label>
        <Select
          value={platform}
          onValueChange={(v) => setPlatform(v as "ios" | "android")}
        >
          <SelectTrigger id="new-app-platform">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ios">App Store</SelectItem>
            <SelectItem value="android">Google Play</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <p className="text-muted-foreground text-xs">
        Nothing is fetched and nothing is scored yet - there is no listing out
        there to measure. Write your title and description here; the audit and
        keyword tracking start working the day you go live.
      </p>
      <Button onClick={submit} disabled={createApp.isPending} className="w-full">
        {createApp.isPending && (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        )}
        Create the app
      </Button>
    </div>
  );
}
