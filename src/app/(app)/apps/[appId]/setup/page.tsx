"use client";

import { useParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  FileText,
  Package,
  Upload,
} from "lucide-react";

import { useApp } from "@/hooks/use-apps";

const STEPS = [
  {
    icon: FileText,
    title: "Create a default store listing",
    description:
      "In Google Play Console, go to Main store listing and fill in the required fields: app name, short description, full description, and at least 2 screenshots. This is the minimum Google requires before you can publish.",
    consolePath: "store-listing",
  },
  {
    icon: Package,
    title: "Upload at least one release",
    description:
      "Go to any release track (Internal testing is the quickest) and upload an APK or AAB file. You need at least one binary uploaded before Google allows publishing.",
    consolePath: "tracks/internal-testing",
  },
  {
    icon: Upload,
    title: "Publish to any track",
    description:
      "Review and roll out the release on the track you chose. Once Google processes it (even if it's only internal testing), the app exits draft state and becomes fully manageable via API.",
    consolePath: "tracks/internal-testing",
  },
] as const;

export default function SetupPage() {
  const params = useParams<{ appId: string }>();
  const app = useApp(params.appId);
  const externalId = app.data?.externalId;

  const consoleBase = externalId
    ? `https://play.google.com/console/developers/app/${externalId}`
    : "https://play.google.com/console";

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-foreground">
            Initial setup required
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            This app is currently in <strong>draft state</strong> on Google Play.
            Google requires at least one published release before the app can be
            managed through the API. Until then, push and publish features are
            disabled in AppBoard.
          </p>
        </div>
      </div>

      <div className="mt-8 space-y-1">
        <h2 className="text-sm font-medium text-foreground">
          Complete these steps in Google Play Console
        </h2>
        <p className="text-xs text-muted-foreground">
          Follow the steps below to bring your app out of draft state. After
          that, sync your app in AppBoard and everything will work.
        </p>
      </div>

      <ol className="mt-6 space-y-4">
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            className="rounded-lg border border-border bg-[#1a1a1a] p-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <step.icon className="h-4 w-4 text-muted-foreground" />
                  <h3 className="text-sm font-medium text-foreground">
                    {step.title}
                  </h3>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
                <a
                  href={`${consoleBase}/${step.consolePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                >
                  Open in Google Play Console
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-lg border border-green-500/20 bg-green-500/5 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
          <div>
            <p className="text-sm font-medium text-foreground">
              After completing the steps above
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Come back to AppBoard and click <strong>Sync All</strong> in the
              sidebar. Once the app is synced, the draft warning will disappear
              and you&apos;ll be able to push listings, screenshots, and other
              changes directly from AppBoard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
