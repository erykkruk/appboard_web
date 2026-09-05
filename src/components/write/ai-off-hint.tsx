"use client";

import { KeyRound } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AiOffHintProps {
  /** The backend's own words, when they add something to the headline. */
  detail?: string;
  href?: string;
}

/** The one message every AI failure that Settings can fix resolves to. */
export function AiOffHint({ detail, href = "/settings" }: AiOffHintProps) {
  return (
    <Alert>
      <KeyRound />
      <AlertTitle>AI is off.</AlertTitle>
      <AlertDescription>
        <p>
          Add an OpenRouter key in{" "}
          <Link
            href={href}
            className="font-medium text-foreground underline underline-offset-4"
          >
            Settings
          </Link>
          , then come back.
        </p>
        {detail && <p className="text-xs">{detail}</p>}
      </AlertDescription>
    </Alert>
  );
}
