"use client";

import { Check, Copy, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditAiInsights } from "@/lib/types";

const REWRITE_LABELS: Array<{
  key: keyof AuditAiInsights["rewrites"];
  label: string;
}> = [
  { key: "title", label: "Title" },
  { key: "subtitle", label: "Subtitle" },
  { key: "keywords", label: "Keyword field" },
  { key: "opening", label: "Description opening" },
];

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          toast.success(`${label} copied`);
          setTimeout(() => setDone(false), 1500);
        } catch {
          toast.error("Could not copy");
        }
      }}
    >
      {done ? (
        <Check className="mr-1.5 h-3.5 w-3.5" />
      ) : (
        <Copy className="mr-1.5 h-3.5 w-3.5" />
      )}
      Copy
    </Button>
  );
}

/**
 * What the model made of the same numbers the audit shows above. It is a
 * reading, not a rule: the score never depends on it, and every rewrite is
 * pasted by hand into the Text screen, never applied on its own.
 */
export function AuditAiReview({
  ai,
  appId,
}: {
  ai: AuditAiInsights;
  appId: string;
}) {
  const rewrites = REWRITE_LABELS.filter((r) => ai.rewrites[r.key]);
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4" />
            AI review
          </CardTitle>
          <p className="mt-1 text-muted-foreground text-xs">
            {ai.model} · {new Date(ai.generatedAt).toLocaleString()} · reads the
            audit above; the score does not depend on it
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/apps/${appId}/text`}>Open Text</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm">{ai.summary}</p>

        {ai.priorities.length > 0 && (
          <ol className="space-y-3">
            {ai.priorities.map((priority, index) => (
              <li
                key={priority.title}
                className="flex gap-3 rounded-lg border p-3"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-foreground font-bold text-background text-xs">
                  {index + 1}
                </span>
                <div className="min-w-0 space-y-1">
                  <div className="font-medium text-sm">{priority.title}</div>
                  <div className="text-muted-foreground text-xs">
                    {priority.why}
                  </div>
                  <div className="text-xs">{priority.how}</div>
                </div>
              </li>
            ))}
          </ol>
        )}

        {rewrites.length > 0 && (
          <div className="space-y-3">
            <p className="font-medium text-sm">Proposed rewrites</p>
            {rewrites.map((r) => {
              const text = ai.rewrites[r.key] as string;
              return (
                <div key={r.key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground text-xs">
                      {r.label} · {text.length} characters
                    </span>
                    <CopyButton text={text} label={r.label} />
                  </div>
                  <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 font-mono text-sm">
                    {text}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
