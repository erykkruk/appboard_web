"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { useAiStatus } from "@/hooks/use-ai";

/**
 * Everything an OpenRouter key switches on, in one list. Rendered only when
 * AI is off, so a screen can say up front what a key buys instead of letting
 * a button fail on click. Everything NOT on this list works without a key.
 */
export const AI_UNLOCKS = [
  "Smarter keyword ideas for your description (the ones taken from your own text work without a key)",
  "Rewrite the description around the keywords you pick",
  "Draft replies to reviews",
  "Translate the whole listing into every language you ship",
  "Fill privacy answers and write release notes from a short brief",
];

export function AiUnlockCard({ compact = false }: { compact?: boolean }) {
  const status = useAiStatus();
  if (!status.data) return null;

  // A key that exists but was rejected is worse than no key: every button
  // looks live and every click fails. Say it before the first click.
  if (status.data.configured) {
    if (!status.data.lastError) return null;
    return (
      <Card className="border-amber-500/40">
        <CardContent className={compact ? "pt-4 pb-4" : "pt-6"}>
          <div className="flex items-start gap-3 text-sm">
            <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
            <p>
              <span className="font-medium">
                Your OpenRouter key is not working
              </span>{" "}
              <span className="text-muted-foreground">
                ({status.data.lastError}). Check it in{" "}
                <Link href="/settings" className="underline underline-offset-4">
                  Settings
                </Link>
                . Everything that does not need AI keeps working.
              </span>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className={compact ? "pt-4 pb-4" : "pt-6"}>
        <div className="flex items-start gap-3">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">AI is off.</span>{" "}
              <span className="text-muted-foreground">
                Scores, the audit, text fixes, screenshots, rankings and reminders
                all work without it. Add an OpenRouter key in{" "}
                <Link href="/settings" className="underline underline-offset-4">
                  Settings
                </Link>{" "}
                and you also get:
              </span>
            </p>
            {!compact && (
              <ul className="list-disc space-y-0.5 pl-5 text-muted-foreground">
                {AI_UNLOCKS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
