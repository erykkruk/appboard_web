export interface ChangelogEntry {
  version: string;
  serverVersion: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
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
