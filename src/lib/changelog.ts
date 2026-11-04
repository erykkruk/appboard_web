export interface ChangelogEntry {
  version: string;
  serverVersion: string;
  date: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.23.0",
    serverVersion: "0.23.0",
    date: "2026-11-04",
    changes: [
      "Daily summary for all apps: one email at 07:30 (Europe/Warsaw) covering every app with rank tracking or auto-research, with tracked, ranked and top 10 counts without your app name, the five biggest gains and drops, starred keywords, the three strongest markets and the latest auto-research with its best new keyword ideas. Turn it on under Automations > Reminders",
      "While the daily summary is on, the per-app rank digests and research reports are not sent, so you get one email a morning instead of several. Turned off, everything works as before",
      "Pick a different address for the summary, or leave it empty to use your apps' report email or your account email, and press Send a test summary now to see it right away",
    ],
  },
  {
    version: "0.22.0",
    serverVersion: "0.22.0",
    date: "2026-11-04",
    changes: [
      "Store performance, a new page under Marketing & ASO for Google Play apps: store listing visitors, acquisitions and conversion per month, split by traffic source (Google Play search, Ads and referrals, Other), search term, UTM campaign and country, plus the installs overview. Pick the month at the top",
      "The numbers come from the monthly reports Google Play writes to your developer account's Cloud Storage bucket. Paste the bucket once per Google Play connection (Settings > Connected Stores > Play reports bucket, from Play Console > Download reports > Copy Cloud Storage URI). The service account needs the Play Console permission View app information and download bulk reports; when it is missing the page says so and how to grant it",
      "Play's own labels such as Other and No search terms specified are shown apart from real search terms, and Android TV packages say why all their traffic is Other",
      "App Store apps show that App Store analytics are coming later",
    ],
  },
  {
    version: "0.21.2",
    serverVersion: "0.21.2",
    date: "2026-11-04",
    changes: [
      "The Median column of the dashboard market table leaves out your app name too, like Ranked, Top 10 and Top 50, so a market where only the name ranks shows - instead of #3",
    ],
  },
  {
    version: "0.21.1",
    serverVersion: "0.21.0",
    date: "2026-11-04",
    changes: [
      "Research reports mark the keywords you already track in that market as Tracked instead of offering Add again",
    ],
  },
  {
    version: "0.21.0",
    serverVersion: "0.21.0",
    date: "2026-11-04",
    changes: [
      "Star the keywords that are yours: a star next to every keyword on the dashboard, in the Keywords & Rankings tracker and tracked list, and in Research > Keyword scores. Starring an idea there tracks it first (the 40 slots per market still apply)",
      "Every keyword list has a Starred / All switch. Lists open on Starred once the market has starred keywords and on All until then; the choice is kept in the address bar (?kw=starred), so a link or a reload shows the same view",
      "The dashboard chart opens on your starred keywords of the market (up to 20) instead of the 20 most searched ones, as soon as the market has any",
      "The market table on the dashboard gets a Starred top 10 column (starred keywords in the top 10, of all starred) once something is starred",
    ],
  },
  {
    version: "0.20.1",
    serverVersion: "0.20.1",
    date: "2026-11-03",
    changes: [
      "The dashboard opens with a table of how strong you are in every market: tracked keywords, how many rank, top 10, top 50, median position, your best keyword and what moved. Counts leave out your app name, so a market where only your own name ranks no longer looks strong. Sort by any column, click a market to chart it",
      "The dashboard opens on your strongest market instead of the first one where anything ranks",
      "The chart starts with the 20 most searched keywords of the market. A keyword the store did not show sits on a labelled not ranked line, a keyword no check has reached yet is listed under the chart, and a history of a single day says when the first lines appear instead of showing an empty chart",
    ],
  },
  {
    version: "0.20.0",
    serverVersion: "0.20.0",
    date: "2026-11-03",
    changes: [
      "Research > Keyword scores opens with Your keywords: the keywords you track in your strongest market, prefilled, with their position, popularity, difficulty and its trend, followed by up to 20 keyword ideas taken from the apps that rank for them. Track an idea in one click (the header shows how many of the 40 slots are used)",
      "Everything in Your keywords comes from stored scores. Score missing scores only what was never scored, at most 20 keywords per click",
      "Auto-research runs at 06:00 (Europe/Warsaw), away from the 00:00 and 12:00 rank checks and the 01:00 score refresh. Each run researches your home market and scores new ideas in your other tracked markets; a daily run spreads the markets over the week so each one is covered at least weekly",
      "Automations and Research > Automation show when auto-research runs next",
      "Run research starts on the market you track instead of the United States, lists tracked markets first and says how many tracked keywords it will check",
    ],
  },
  {
    version: "0.19.3",
    serverVersion: "0.19.2",
    date: "2026-11-03",
    changes: [
      "The app dashboard opens with Keyword positions: your markets ordered by how many keywords reach the top 10, and for the chosen market a chart of positions over time (#1 at the top, a gap where the store did not show you) next to each keyword's position, change and best. Tick up to 8 keywords to draw",
      "The app menu is grouped into sections: Marketing & ASO (Dashboard, Keyword rankings, Research, Fixes), Store (Text & keywords, Screenshots, About this app, In-app products, History, Publish and the version picker), Reviews, Sales, Automations, Tools and Settings. Every old link still works",
      "Keyword rankings has its own menu entry, and the Research tabs live in the address bar, so a link or the back button lands on the same tab. Switching apps keeps the tab too",
      "Tracked keywords is a compact list: one row per market with its slots used and how many keywords rank, the selected market open, a filter for keywords and markets, and Expand all / Collapse all",
      "Sales is a new page that is still in progress: it lists what it will measure and shows no numbers until real sales data is connected",
      "The app switcher names the TV builds (Android TV, Apple TV), so separate store records of one product are easy to tell apart. An Apple TV only app no longer shows the rankings entry, since Apple publishes no tvOS search",
      "A keyword that was never measured says when it will be (the next check at 00:00 or 12:00), and empty cells show a plain hyphen",
    ],
  },
  {
    version: "0.19.2",
    serverVersion: "0.19.2",
    date: "2026-11-03",
    changes: [
      "App Store audit reads the subtitle and keyword field synced from App Store Connect, so it no longer reports an empty subtitle that is not empty",
      "Keywords we checked starts with the keywords you track in that market and the terms of your keyword field, before words taken from the description",
      "A proposed keyword field is built on your current one: it keeps your terms and only swaps the ones that repeat the title or subtitle or that you cannot win, and the AI review can no longer replace the whole field with a single word",
      "One winnable rule everywhere: a keyword marked too hard in the table is never called winnable in the AI review",
    ],
  },
  {
    version: "0.19.1",
    serverVersion: "0.19.1",
    date: "2026-11-03",
    changes: [
      "Track up to 40 keywords per market instead of 20, so a market served in two languages (for example English and Spanish in the United States) fits in one tracker",
    ],
  },
  {
    version: "0.19.0",
    serverVersion: "0.19.0",
    date: "2026-11-03",
    changes: [
      "Keywords & Rankings has a new Markets card under the keyword list: every country you track, with how many keywords rank, how many are in the top 10 and top 50, the median and average position, what moved since the previous check and when it was last measured. Pick a market to open its tracker",
      "Track any App Store storefront: the market picker lists every country by name instead of six, with the markets you already use at the top",
      "Check now runs in the background and shows its progress, so a check of hundreds of keywords no longer times out. Lookups are paced per store and retried when the store throttles us, and a keyword the store refused to answer is shown as not measured instead of as a lost ranking",
      "Apple TV and Android TV: mark the devices an app serves in App Settings. An Android TV package added from its Google Play link is tracked in Google Play search; Apple TV has no public search, so an iOS app that also runs on Apple TV is measured in iPhone search and an Apple TV only app is shown as listing and audit only",
      "MCP server: import an app from a store link, add keywords for many markets in one call, read the per-market overview and boards, start a rank check and follow its status, change tracking settings and run research",
    ],
  },
  {
    version: "0.18.0",
    serverVersion: "0.18.0",
    date: "2026-09-08",
    changes: [
      "Keywords & Rankings is now a tracker: one table per market with your position and its change, your best position ever, difficulty with its trend, popularity, targeting, which of your listing fields already use the term, and the app that owns the first result. Search, sort, and a filter for winnable targets only",
      "Positions over time draws one small chart per keyword instead of twenty lines in one frame, with #1 at the top, a break in the line where the store did not show you (that is a missing measurement, not position 50) and a dashed marker on every day you changed the listing",
      "Movement lists what happened since the previous check: entering and falling out of the scanned results are written out as events, never as a made-up jump in position",
      "Metadata vs ranking: the terms your title, subtitle or keyword field target while the store does not rank you for them, and the keyword-field terms nothing measures yet - each with a button to start tracking it",
      "Your changes and Measurements tabs: the before-and-after of every published listing edit, and every measurement run with how many keywords were measured, how many rank and the average difficulty",
      "Listing audit gained a score over time, with what you changed since the previous measurement listed underneath - so a move can be read as yours or as the market's. The keyword table also names who leads each term",
    ],
  },
  {
    version: "0.17.0",
    serverVersion: "0.17.0",
    date: "2026-09-07",
    changes: [
      "Free ASO check-up covers every market: paste a store link and the listing is read and scored in each of the 30 storefronts we know (App Store and Google Play), with a per-market overview (score, ranking keywords, first-page keywords, best opportunity) and a full report per market. A single market is still one click away, and a long run can be stopped early",
      "Every finished check-up gets a link to share: the address bar turns into /aso-check/r/<id>, Copy link puts it on the clipboard, and anyone can open the report without an account. Snapshots are kept for a year",
    ],
  },
  {
    version: "0.16.3",
    serverVersion: "0.16.3",
    date: "2026-09-07",
    changes: [
      "Write with AI reads your current title, subtitle and keyword field before it writes, so a word already in the title is not spent again in the keyword field; the prompts now know Google Play's 500-character release-note limit and the Play category list",
      "Keyword suggestions keep rival app names out of the chips: the stores reject them in listing text, so they are returned separately for rank tracking only",
      "AI review of a Google Play audit proposes the 80-character short description instead of an App Store subtitle and never a keyword field; its summary is in English while rewrites stay in the listing language",
      "Review replies may invite a customer to update their review after a fix (never for a reward) and no longer invent a support address; translations keep store limits and policies even when custom instructions ask otherwise",
    ],
  },
  {
    version: "0.16.2",
    serverVersion: "0.16.2",
    date: "2026-09-07",
    changes: [
      "A listing audit that cannot run (the store does not know the app, or it is not published in that market) now says so, with the store's reason and a Try again button, instead of showing 'Measuring your listing' forever",
    ],
  },
  {
    version: "0.16.1",
    serverVersion: "0.16.1",
    date: "2026-09-07",
    changes: [
      "The listing audit is measured once and kept: opening the app no longer re-measures it. Every stored audit is refreshed on Monday at 03:00, and Re-check still measures on demand",
      "Google Play apps get an audit too: the text and screenshot rules on the live listing, with an honest note that keyword difficulty is App Store only",
      "AI review of the audit: with an OpenRouter key, the model you picked for research reads the numbers and returns what to fix first plus rewrites for the title, subtitle, keyword field and description opening, within store limits and using only keywords from your category",
      "Model picker in Settings searches OpenRouter's live catalog (400+ text models with prices per million tokens) instead of a fixed list; any model id can still be typed",
      "Free tools menu in the top bar; the free ASO check-up puts things you can act on ahead of context like 'few ratings'",
    ],
  },
  {
    version: "0.16.0",
    serverVersion: "0.16.0",
    date: "2026-09-05",
    changes: [
      "New guided flow for every app: paste a link (or start an app that is not published yet) -> review the text we pulled -> audit with a fix queue -> text fixes as accept-or-reject diffs -> screenshots opened in the editor with your own files -> reminders. A step strip shows where you are",
      "Listing score is now computed by the backend on the live store listing, in the language of the market you imported from, with a second score for your unpublished draft. Rules that AppBoard cannot act on (few ratings, stale update) are shown as context, never as a button",
      "Keywords the audit checks now include the vocabulary of the apps you actually compete with, filtered to your own category - so a party game is never told to chase 'screen mirroring'",
      "Imports pull every language the store lists (title, description and screenshots per language, full-size files), reviews from every storefront the app is sold in, and the store's real rating and live version - the dashboard shows '4.0 from 5 ratings, 1 with text' instead of an average of the one review with text",
      "Top navigation replaces the left sidebar: an app switcher that doubles as a multi-select ('Apply to N apps'), and a horizontal context bar per app. Help, changelog, the privacy questionnaire and the connect-store shortcut are all reachable again",
      "Screenshots page per app: see the files synced from the store and open any of them in the editor with one click; the editor opens from the fix queue with your first screenshot already in the device",
      "Rank charts mark releases (solid) and text edits (hollow) so a jump can be attributed; unpublished drafts trigger a reminder email after three days",
      "Write with AI works further without a key: 'What am I targeting?' now reads keyword candidates from your own title and description (scored the same way) when there is no AI key or the provider rejects it - only the rewrite itself needs the model",
      "Publish without a store API: copy the diff or export a CSV, paste it into App Store Connect or Play Console, then press 'I pasted it into the store' - the change lands in History, the rank chart gets its marker, and the reminder stops. Audit buttons for a missing language or a wrong category now open the screen (or the store console) where that is actually changed",
      "Workspace overview at /home (every app: score, rating, reviews, keywords), bulk copy of setup between apps, promo video field for Google Play, and 'Write with AI': infer the keywords your description targets, score them, and generate a description for the ones you pick",
    ],
  },
  {
    version: "0.15.0",
    serverVersion: "0.15.0",
    date: "2026-09-01",
    changes: [
      "Add your app with just a store link: paste an App Store or Google Play URL (or search by name) and get a fully synced app - listing, screenshots, ratings and reviews - with research, rank tracking and an ASO check-up. No API credentials needed",
      "Connecting store API credentials is now an optional add-on, needed only for publishing: pushing listings, uploading screenshots, replying to reviews and managing purchases - each of those surfaces now shows a one-click 'Connect store API' setup",
      "New ASO Check-up card on every app dashboard: score your live listing in your browser on demand and get the top things to improve, each linking straight to the screen that fixes it",
      "Apps from public links are marked with a 'Public' badge on their store, and everything read-only keeps working exactly as for API-connected apps",
    ],
  },
  {
    version: "0.14.0",
    serverVersion: "0.14.0",
    date: "2026-08-31",
    changes: [
      "Free ASO check-up at /aso-check - paste any App Store link and get a full report with zero setup: keyword scores, your rankings (top 200), competition breakdown, listing audit with an ASO score and three concrete next steps",
      "The check-up runs entirely in your browser: your device talks directly to Apple's public API and computes all scores locally with the same engine the panel uses - no account, nothing to connect",
      "Each check-up anonymously contributes its keyword scores to a growing crowd dataset, which will keep making popularity data better for everyone",
    ],
  },
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
      'True 3D devices: iPhone 15 Pro Max and Galaxy S25 Ultra as real WebGL models that rotate in X/Y/Z, plus photographic Apple bezels (iPhone 17 family, iPad Pro 13", Apple Watch S11) with your screenshot composited into the real screen cutout',
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
