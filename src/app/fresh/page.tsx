"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Local development only: creates a brand-new empty workspace and drops you
 * on the first step of the flow. The backend route behind it exists solely
 * when ENABLE_TEST_AUTH=true outside production, so on a real deployment this
 * page just shows the sign-in link.
 */
export default function FreshWorkspacePage() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    fetch("/api/dev/session", { method: "POST" })
      .then((res) => {
        if (!res.ok) throw new Error(`fresh session failed (${res.status})`);
        router.replace("/start");
      })
      .catch(() => setError(true));
  }, [router]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      {error ? (
        <>
          <p className="text-muted-foreground text-sm">
            Fresh workspaces are available only on a local backend started with
            ENABLE_TEST_AUTH=true.
          </p>
          <a className="text-sm underline" href="/login">
            Go to sign in
          </a>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">
            Creating an empty workspace...
          </p>
        </>
      )}
    </div>
  );
}
