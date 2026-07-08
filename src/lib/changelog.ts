export interface ChangelogEntry {
  version: string;
  serverVersion: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
