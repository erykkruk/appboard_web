import type { AnalyticsEvent } from "@/lib/analytics-events";

/**
 * Thin indirection over the analytics client (PostHog). Feature code imports
 * `capture()` from here and never touches `posthog-js` directly, so tracking is
 * a silent no-op wherever analytics is not configured — local dev, tests,
 * self-hosted installs without a PostHog key, or a blocked script.
 */

export type AnalyticsProperties = Record<
	string,
	string | number | boolean | null | undefined
>;

export interface AnalyticsClient {
	capture: (event: AnalyticsEvent, properties?: AnalyticsProperties) => void;
	identify: (distinctId: string, properties?: AnalyticsProperties) => void;
	reset: () => void;
}

/**
 * Events captured before the client is registered. React runs child effects
 * before parent effects, so a page's mount event fires before the root
 * provider has initialised PostHog. Capped so an install that never registers
 * a client cannot grow this without bound.
 */
const PENDING_LIMIT = 50;
const pending: Array<{
	event: AnalyticsEvent;
	properties?: AnalyticsProperties;
}> = [];

let client: AnalyticsClient | null = null;

/** Registered by the PostHog provider once init succeeds; `null` on unmount. */
export function setAnalyticsClient(next: AnalyticsClient | null): void {
	client = next;
	if (!client) return;
	for (const queued of pending.splice(0)) {
		client.capture(queued.event, queued.properties);
	}
}

export function capture(
	event: AnalyticsEvent,
	properties?: AnalyticsProperties,
): void {
	if (client) {
		client.capture(event, properties);
		return;
	}
	if (pending.length < PENDING_LIMIT) {
		pending.push({ event, properties });
	}
}

export function identify(
	distinctId: string,
	properties?: AnalyticsProperties,
): void {
	client?.identify(distinctId, properties);
}

/** Drops the identity on sign-out so the next session starts anonymous. */
export function resetIdentity(): void {
	client?.reset();
}
