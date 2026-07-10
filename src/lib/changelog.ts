export interface ChangelogEntry {
  version: string;
  serverVersion: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.8.0",
    serverVersion: "0.8.0",
    date: "2026-07-10",
    changes: [
      "Keyword Rankings on the app dashboard: a new card shows how your app ranks in store search — tracked keywords, average position, top-10 count and improving vs declining, with top keywords listed with day-over-day changes",
      "Zero-setup tracking: keywords added in the Information tab (must-include + long-tail) are imported into rank tracking automatically, the first position check runs on its own and the twice-daily scheduler takes over from there",
      "Research page tabs are now linkable — 'View all' on the dashboard card jumps straight to Keywords & Rankings",
      "Demo account ships with two weeks of realistic keyword-ranking history on Lumina and Pulse",
    ],
  },
  {
    version: "0.7.2",
    serverVersion: "0.7.1",
    date: "2026-07-09",
    changes: [
      "New AppBoard branding: hexagon-A logo in the sidebar, on the sign-in page and as the favicon",
      "Violet brand accent across the panel — primary buttons, focus rings and chart colors now match appboard.dev",
    ],
  },
  {
    version: "0.7.1",
    serverVersion: "0.7.1",
    date: "2026-07-09",
    changes: [
      "Deep research fixed for reasoning AI models (e.g. GLM 5.x): responses were truncated mid-JSON — the token cap is now high enough for thinking + the full report",
      "Long research runs no longer die with a 500: the panel proxy now waits up to 15 minutes instead of 2 for slow backend requests",
    ],
  },
  {
    version: "0.7.0",
    serverVersion: "0.7.0",
    date: "2026-07-09",
    changes: [
      "Research is now built into every app — a new Research tab at the top of each app lets you run market research on that app and save every report to history",
      "Keyword rank tracking: track up to 20 keywords per language, see current positions with day-over-day changes, and a history chart with amber markers showing exactly when you changed a listing",
      "Automations: turn on daily rank tracking (measured at 00:00 and 12:00), schedule auto-research (daily/weekly/monthly), and get the results emailed to you",
      "Add to my keywords: one click from any research report to start tracking a keyword",
      "Standalone Research tool now lets you save reports to history and reopen them later",
    ],
  },
  {
    version: "0.6.11",
    serverVersion: "0.6.3",
    date: "2026-07-09",
    changes: [
      "Sidebar: wider rail that now shows each app and group name next to its icon (with labels on Stores, Groups, Research and Settings too)",
      "Scrolling: onboarding and Research now scroll from anywhere on the page — including the far right edge — instead of only over the centered content",
      "Onboarding: wider layout",
    ],
  },
  {
    version: "0.6.10",
    serverVersion: "0.6.3",
    date: "2026-07-09",
    changes: [
      "Google Play Setup page: added the 'cloudshell download' key-download instructions right where you upload the key, not just in the full guide",
    ],
  },
  {
    version: "0.6.9",
    serverVersion: "0.6.3",
    date: "2026-07-09",
    changes: [
      "Google Play setup: the script now auto-downloads the key file and the guide explains how to grab it (cloudshell download / right-click Download)",
    ],
  },
  {
    version: "0.6.8",
    serverVersion: "0.6.3",
    date: "2026-07-09",
    changes: [
      "Google Play setup guide: pick between an Automated (script) path and a Manual (Console) path — the manual path walks you through every click yourself",
      "Setup script now disables BOTH the legacy and the newer 'managed' key-creation org policy (fixes key creation still being blocked after the legacy one was turned off)",
    ],
  },
  {
    version: "0.6.7",
    serverVersion: "0.6.3",
    date: "2026-07-09",
    changes: [
      "Google Play setup guide: added a 'Key creation failed?' troubleshooting section explaining how to turn off the org policy manually (or use another project) when the script can't do it automatically",
    ],
  },
  {
    version: "0.6.6",
    serverVersion: "0.6.3",
    date: "2026-07-08",
    changes: [
      "App Store: 'Push to App Store' now actually pushes your version localization edits (title, description, keywords, what's new…) — previously it only handled Google Play and silently pushed nothing for iOS",
      "Pending changes: the push preview now shows dirty App Store version-localization edits, not just Google Play listing changes",
    ],
  },
  {
    version: "0.6.5",
    serverVersion: "0.6.2",
    date: "2026-07-08",
    changes: [
      "Google Play setup script: now grants Org Policy Admin and sets a project-level override so service-account key creation works even when Google's org policy blocks it by default",
      "App Store: opening a listing for a language with no synced data no longer errors with 'Listing not found'",
      "Reliability: all backend errors are now recorded to the database (secrets scrubbed) for faster diagnosis",
    ],
  },
  {
    version: "0.6.4",
    serverVersion: "0.6.1",
    date: "2026-07-08",
    changes: [
      "AI: fixed AI generation failing with a 502 — the model list now uses valid OpenRouter IDs (dead Gemini preview IDs removed), and an invalid model now shows a clear error instead of a gateway crash",
      "AI settings: model picker updated to current models — GLM 5.2/4.7/4.6, Gemini 3 Flash & 2.5, Claude 4.x, DeepSeek V3.1, Grok 4.3, Qwen3",
    ],
  },
  {
    version: "0.6.3",
    serverVersion: "0.6.0",
    date: "2026-07-08",
    changes: [
      "Scrolling: any page taller than the viewport now scrolls instead of being cut off",
      "AI settings: added GLM 5.2 and 4.6, Claude Sonnet/Opus 4.x, DeepSeek V3.1, Grok 4 and Qwen3 to the model picker",
    ],
  },
  {
    version: "0.6.2",
    serverVersion: "0.6.0",
    date: "2026-07-08",
    changes: [
      "Listings: on a published (locked) version, clicking a field now opens a prompt to create a new editable version — or jump to an existing draft",
      "Google Play setup: the generated script now auto-allows service-account key creation (handles Google's default org policy) and is safe to re-run",
      "Onboarding: fixed the setup wizard not scrolling on smaller screens",
    ],
  },
  {
    version: "0.6.1",
    serverVersion: "0.6.0",
    date: "2026-07-08",
    changes: [
      "Screenshot editor: panorama mode — design one wide image spanning 2–5 screens with split guides; export slices and uploads all screenshots at once",
      "Screenshots strip: always-visible scrollbar",
      "Sidebar: wider rail, hide apps with a show-hidden toggle",
      "Real Apple and Google Play logos for store markers",
    ],
  },
  {
    version: "0.6.0",
    serverVersion: "0.6.0",
    date: "2026-07-08",
    changes: [
      "Responsive wide layouts across the entire panel — pages now use the full width of large monitors, with cards and sections arranged side by side",
      "Version popup in the sidebar showing panel version, server version and release notes",
      "History: By date mode with date list in sheet and cumulative since-date preview",
      "Change history preview redesign with compact version list",
      "Screenshot editor: Add menu fixes (Add image moved into the Add dropdown)",
      "Server: store capability gating per store type, vault guard hardening, research module improvements",
    ],
  },
  {
    version: "0.5.5",
    serverVersion: "0.5.5",
    date: "2026-07-07",
    changes: [
      "Butterkit parity: research section, E2EE vault UI, public demo page, screenshot editor",
      "Providers, publishing, purchases and app groups",
    ],
  },
];
