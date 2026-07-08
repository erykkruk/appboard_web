"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export default function DemoPage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/demo/session", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`demo session failed (${res.status})`);
        router.replace("/dashboard");
      })
      .catch(() => setError(true));
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {error ? (
        <>
          <p className="text-sm text-muted-foreground">
            The demo account is being reset right now. Please try again in a
            minute, or sign in with your own account.
          </p>
          <a className="text-sm underline" href="/login">
            Go to sign in
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Preparing your demo workspace…
          </p>
        </>
      )}
    </div>
  );
}
