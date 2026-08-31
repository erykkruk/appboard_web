export interface ChangelogEntry {
  version: string;
  serverVersion: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.13.1",
    serverVersion: "0.13.0",
    date: "2026-08-31",
    changes: [
      "History & trends: expanding a keyword now also shows Apple's official weekly popularity (when synced) and a full snapshot view - the difficulty breakdown, ranking tiers, download table and competitor list exactly as stored that day",
    ],
  },
  {
    version: "0.13.0",
    serverVersion: "0.13.0",
    date: "2026-08-31",
    changes: [
      "Apple Ads integration: connect your free Apple Ads API key in Settings to power keyword scoring with Apple's OFFICIAL weekly search popularity - scored keywords show an 'official' badge, and terms outside Apple's dataset keep the estimate capped below their category floor",
      "Keyword score history: every search now stores one snapshot per keyword, country and day (kept 90 days) - the new History & trends tab shows the latest scores, per-day popularity/difficulty/opportunity trend charts and lets you delete entries",
      "Automatic nightly refresh: keywords tracked on an app re-score every night, so trends build up without manual searches",
      "ASO posture summary: per-country cards with estimated daily downloads from your current ranks (as ranges), targeting-label distribution and top opportunities",
      "Official popularity movers: week-over-week biggest changes from Apple's dataset, per country",
      "Impression share (Apple Ads): per-app card showing the search terms where your ads served and the share of impressions captured",
      "Sturdier scoring: when the iTunes API is throttled, searches fall back to the App Store website data; rank checks now scan the top 200 (was 50)",
      "New 'How scoring works' methodology reference right next to the keyword tools",
    ],
  },
  {
    version: "0.12.1",
    serverVersion: "0.12.0",
    date: "2026-08-31",
    changes: [
      "Research: new Keyword Scores tab - score up to 20 App Store keywords at once with search popularity (1-100), competition difficulty (full sub-score breakdown plus Top 5/10/20 ranking tiers), opportunity score, targeting advice (Sweet Spot, Hidden Gem, ...) and estimated daily downloads per ranking position",
      "Every scored keyword lists the top apps ranking for it - icons, ratings, review counts, genre, release year and App Store links - so you can size up the competition at a glance",
      "Country Opportunity Finder: scan up to 30 App Store regions for one keyword and get them ranked by where your ranking opportunity is best",
      "On an app's Research page the Keyword Scores tab also shows your app's current search rank for every scored keyword and country",
      "Keyword results export to CSV, and recent searches are kept in your browser for one-click reloading",
    ],
  },
  {
    version: "0.12.0",
    serverVersion: "0.12.0",
    date: "2026-08-30",
    changes: [
      "Passphrase encryption (E2EE vault) is now optional and off by default - store credentials are always encrypted, and you can turn end-to-end passphrase protection on or off anytime in Settings",
      "New 'Disable encryption' action in Settings keeps all your store credentials working - they are safely re-encrypted with the server key, no reconnecting needed",
    ],
  },
  {
    version: "0.11.3",
    serverVersion: "0.11.0",
    date: "2026-08-30",
    changes: [
      "MCP server: new research_keyword_scores tool - AI agents connected over MCP (Claude Code, Cursor, Claude Desktop) can now score App Store keywords (popularity, difficulty with ranking tiers, opportunity, classification and download estimates) directly from the assistant",
    ],
  },
  {
    version: "0.11.2",
    serverVersion: "0.10.0",
    date: "2026-08-30",
    changes: [
      "Research: new keyword scoring API - estimates search popularity (1-100), competition difficulty with a full sub-score breakdown and Top 5/10/20 ranking tiers, opportunity score and targeting classification (Sweet Spot, Hidden Gem, ...) plus daily download estimates per ranking position, for up to 10 keywords per request",
      "Keyword difficulty automatically corrects for Apple's search backfill (weak leaders, padded results) and detects brand keywords, so niche keywords are no longer misread as highly competitive",
    ],
  },
  {
    version: "0.11.1",
    serverVersion: "0.9.0",
    date: "2026-08-10",
    changes: [
      "Mobile: views that need a desktop now say so instead of breaking - the screenshot editor, the free editor and the app workspace show a short explanation with a way back",
      "Mobile: the main navigation is now a drawer opened from a top bar, so the sidebar no longer squeezes the page on a phone",
      "Mobile: the settings screens stack properly and their sections are reachable from a scrollable tab strip",
    ],
  },
  {
    version: "0.11.0",
    serverVersion: "0.9.0",
    date: "2026-08-07",
    changes: [
      "Alternative app stores: connect Huawei AppGallery, Samsung Galaxy Store, Amazon Appstore, Xiaomi GetApps, RuStore and ONE Store",
      "Each alternative store now asks for its real API credentials (client ID and secret, service account, or PEM private key) instead of a single generic token, with a hint telling you where to create the key in that store's console",
      "Huawei AppGallery and Amazon Appstore let you list your package names when connecting, because their APIs cannot discover your apps on their own",
      "When a store cannot perform an operation (for example screenshot upload on AppGallery, or publishing on RuStore), the panel now shows the store's own explanation instead of a generic failure message",
    ],
  },
  {
    version: "0.10.3",
    serverVersion: "0.8.1",
    date: "2026-07-27",
    changes: [
      "Analytics: the community invite popup now reports anonymous usage - how often it is shown, how many people open Discord or Reddit from it, and how many dismiss it",
    ],
  },
  {
    version: "0.10.2",
    serverVersion: "0.8.1",
    date: "2026-07-27",
    changes: [
      "Split panorama download now delivers ONE .zip file with all the cut screenshots inside, instead of firing several separate browser downloads",
    ],
  },
  {
    version: "0.10.1",
    serverVersion: "0.8.1",
    date: "2026-07-27",
    changes: [
      "3D devices: fixed dark square corners poking past the phone body - the screen texture now composites with proper transparency, and empty 3D screens get the same rounded corners",
      "New scenes start with the true-3D device by default: iPhone targets get the iPhone 15 Pro Max model, Android targets the Galaxy S25 Ultra (tablets keep the drawn style); switching the frame swaps the matching model automatically",
    ],
  },
  {
    version: "0.10.0",
    serverVersion: "0.8.1",
    date: "2026-07-27",
    changes: [
      "Every device layer is now the same 'Device + screenshot' object: extra devices support the true-3D WebGL models (own screenshot, model choice and X/Y/Z rotation), so you can stack as many rotating 3D mockups in one scene as you like",
      "New devices added from the Layers panel inherit the primary device's style and 3D model, so a multi-device scene stays consistent out of the box",
      "Panorama download got a split option: next to the single wide PNG you can download the panorama pre-cut into X store-ready screenshots, sliced at the exact panel seams",
      "Scene thumbnails now render extra devices' screenshots and 3D models, matching the export pixel-for-pixel",
      "Free editor and self-hosted installs: a small invite to our new Discord and Reddit communities - join in and help shape the roadmap",
    ],
  },
  {
    version: "0.9.2",
    serverVersion: "0.8.1",
    date: "2026-07-27",
    changes: [
      "Fixed two console errors on every page load: analytics no longer calls the feature-flag and remote-config endpoints we do not use",
    ],
  },
  {
    version: "0.9.1",
    serverVersion: "0.8.1",
    date: "2026-07-27",
    changes: [
      "Product analytics (PostHog, self-hosted): we now measure how the free screenshot editor is used and how many people sign up, so we can improve the parts that matter",
      "Analytics is opt-in and off by default - self-hosted installs send nothing unless a PostHog key is configured, and no events are sent from development builds",
      "Guests in the free editor stay anonymous: no person profile is created unless you sign in",
    ],
  },
  {
    version: "0.9.0",
    serverVersion: "0.8.0",
    date: "2026-07-16",
    changes: [
      "Screenshot editor got a major upgrade: new device mockups — iPad, Android tablet, Apple Watch (with band and digital crown) and a laptop — next to the existing iPhone and Android phone frames",
      "True 3D devices: iPhone 15 Pro Max and Galaxy S25 Ultra as real WebGL models that rotate in X/Y/Z, plus photographic Apple bezels (iPhone 17 family, iPad Pro 13\", Apple Watch S11) with your screenshot composited into the real screen cutout",
      "3D device rotation: tilt any mockup in X/Y/Z with one-click pose presets (Hero, Tilt left/right, Lean back) — the export matches the preview pixel-for-pixel",
      "Clay device style: render the frame in any color you pick, ButterKit-style, next to the realistic titanium look",
      "Social-proof elements: review cards (quote, stars, author), award laurels, 5-star rows, hearts, checkmarks and emoji stickers",
      "Text power-ups: accent words in a second color, style presets, lock layers, copy a text's or annotation's style to all others, annotation borders and corner radius",
      "20 scene templates inspired by the best App Store pages (Ascent, Sahara, Serif, Midnight, Blueprint, Sunset Blvd, Ethereal, Pinecrest and more) with topographic, dune and grain backgrounds",
      "Drag & drop an image onto the canvas: on the device it becomes the screenshot, elsewhere an image layer",
      "Background gallery: 28 one-click presets — linear, radial and mesh gradients plus pattern combos (dots, grid, waves, diagonal lines, rings) with color, opacity and density controls",
      "Decorative text: gradient fills, marker highlights, curved text, letter spacing, line height and one-click style presets (Hero, Subtitle, Sticker, Marker)",
      "Hand-drawn shapes: arrows, underlines, squiggles, circle marks, sparkles, stars and blobs — recolor, rotate, flip and resize them like any layer",
      "Scene templates: 8 ready-made layouts (Hero 3D, Feature callout, Minimal light/dark, Panorama duo, Bold statement, Curved promo, Clay showcase) that adapt to every App Store and Google Play size and keep your screenshot and fonts when applied",
      "Undo/redo with Cmd+Z / Cmd+Shift+Z, layer duplication and draw-order (z-order) controls",
      "Figma-style snap guides while dragging: layers snap to canvas/panel centers, panorama seams and the device center (hold Alt to bypass)",
      "Landscape mode: flip any scene between portrait and landscape — layers re-flow and exports upload at the correct store size",
      "Export all: render and upload every saved scene for a language/device in one click, with progress and per-scene error reporting",
      "Finishing touches: ground shadow under the device, glass screen glare and a film-grain background pattern",
    ],
  },
  {
    version: "0.8.2",
    serverVersion: "0.8.0",
    date: "2026-07-10",
    changes: [
      "Self-hosting: the backend now waits for PostgreSQL on cold start (retries migrations for up to a minute) instead of crash-looping on one-click platforms",
      "Docker images are now also tagged with their release version (next to latest), so templates can pin exact versions",
    ],
  },
  {
    version: "0.8.1",
    serverVersion: "0.8.0",
    date: "2026-07-10",
    changes: [
      "New Help menu in the sidebar: Documentation, FAQ and Contact support (contact@appboard.dev) — all one click away",
      "The AppBoard logo now links to appboard.dev, both on the sign-in page and in the panel sidebar",
      "Try live demo: a visible button on the sign-in page drops you straight into the shared demo workspace",
    ],
  },
  {
    version: "0.8.0",
    serverVersion: "0.8.0",
    date: "2026-07-10",
    changes: [
      "Keyword Rankings on the app dashboard: a new card shows how your app ranks in store search — tracked keywords, average position, top-10 count and improving vs declining, with top keywords listed with day-over-day changes",
      "Review Sentiment on the app dashboard: positive/neutral/negative breakdown from your latest research run, with what users love and complain about most",
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
