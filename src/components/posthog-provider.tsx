"use client";

import { usePathname, useSearchParams } from "next/navigation";
import posthog from "posthog-js";
import { Suspense, useEffect, type ReactNode } from "react";

import { capture, setAnalyticsClient } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

// Product analytics. Events are ingested through the /ingest rewrite in
// next.config.ts (first-party path — ad blockers drop the PostHog domain), and
// only in production so local traffic never reaches the dashboards.

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

/** Where the toolbar/session links point — the real host, not the proxy. */
const POSTHOG_UI_HOST = "https://posthog.tools.playbuzzin.com";

export { capture } from "@/lib/analytics";

/**
 * App Router does not remount on navigation, so PostHog's automatic pageview
 * never fires again after the first load — we send it ourselves.
 * `useSearchParams` forces a Suspense boundary, hence the split component.
 */
function PageviewTracker() {
	const pathname = usePathname();
	const searchParams = useSearchParams();

	useEffect(() => {
		if (!pathname) return;
		const query = searchParams.toString();
		capture(ANALYTICS_EVENTS.PAGEVIEW, {
			$current_url: `${window.location.origin}${pathname}${query ? `?${query}` : ""}`,
		});
	}, [pathname, searchParams]);

	return null;
}

export function PostHogProvider({ children }: { children: ReactNode }) {
	useEffect(() => {
		if (!POSTHOG_KEY || process.env.NODE_ENV !== "production") return;

		posthog.init(POSTHOG_KEY, {
			api_host: "/ingest",
			ui_host: POSTHOG_UI_HOST,
			capture_pageview: false,
			// Only the events declared in analytics-events.ts are sent. Autocapture
			// would ship the text of every clicked element — app names, listing copy,
			// customer emails visible in the panel — which we must not collect.
			// Session recording is off for the same reason: it would record whatever
			// a guest types into the editor.
			autocapture: false,
			disable_session_recording: true,
			// Guests in the free editor stay anonymous — only signed-in users get
			// a person profile, which keeps the person count meaningful.
			person_profiles: "identified_only",
			defaults: "2025-05-24",
		});

		setAnalyticsClient({
			capture: (event, properties) => {
				posthog.capture(event, properties);
			},
			identify: (distinctId, properties) => {
				posthog.identify(distinctId, properties);
			},
			reset: () => {
				posthog.reset();
			},
		});

		return () => setAnalyticsClient(null);
	}, []);

	return (
		<>
			{children}
			<Suspense fallback={null}>
				<PageviewTracker />
			</Suspense>
		</>
	);
}
