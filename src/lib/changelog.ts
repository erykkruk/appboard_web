export interface ChangelogEntry {
  version: string;
  serverVersion: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
