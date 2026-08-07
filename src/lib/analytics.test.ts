import { beforeEach, describe, expect, mock, test } from "bun:test";

import {
	capture,
	identify,
	resetIdentity,
	setAnalyticsClient,
	type AnalyticsClient,
	type AnalyticsProperties,
} from "./analytics";
import { ANALYTICS_EVENTS } from "./analytics-events";

function buildClient() {
	const captured: Array<{ event: string; properties?: AnalyticsProperties }> =
		[];
	const identified: Array<{
		distinctId: string;
		properties?: AnalyticsProperties;
	}> = [];
	const reset = mock(() => {});

	const client: AnalyticsClient = {
		capture: (event, properties) => captured.push({ event, properties }),
		identify: (distinctId, properties) =>
			identified.push({ distinctId, properties }),
		reset,
	};

	return { captured, client, identified, reset };
}

// Module state is shared across tests - drain the pending queue and unregister
// so every case starts from "analytics not configured".
beforeEach(() => {
	setAnalyticsClient(buildClient().client);
	setAnalyticsClient(null);
});

describe("capture", () => {
	test("is a no-op when no client is registered", () => {
		expect(() =>
			capture(ANALYTICS_EVENTS.FREE_EDITOR_OPENED, { has_draft: false }),
		).not.toThrow();
	});

	test("forwards event and properties to a registered client", () => {
		const { captured, client } = buildClient();
		setAnalyticsClient(client);

		capture(ANALYTICS_EVENTS.FREE_EDITOR_EXPORT, { format: "png" });

		expect(captured).toEqual([
			{
				event: ANALYTICS_EVENTS.FREE_EDITOR_EXPORT,
				properties: { format: "png" },
			},
		]);
	});

	test("flushes events queued before the client was registered", () => {
		capture(ANALYTICS_EVENTS.FREE_EDITOR_OPENED, { has_draft: true });

		const { captured, client } = buildClient();
		setAnalyticsClient(client);

		expect(captured).toEqual([
			{
				event: ANALYTICS_EVENTS.FREE_EDITOR_OPENED,
				properties: { has_draft: true },
			},
		]);
	});

	test("flushes each queued event only once", () => {
		capture(ANALYTICS_EVENTS.FREE_EDITOR_OPENED);
		setAnalyticsClient(buildClient().client);

		const second = buildClient();
		setAnalyticsClient(second.client);

		expect(second.captured).toEqual([]);
	});

	test("caps the pending queue so an unconfigured install cannot grow it", () => {
		for (let i = 0; i < 120; i++) {
			capture(ANALYTICS_EVENTS.FREE_EDITOR_OPENED);
		}

		const { captured, client } = buildClient();
		setAnalyticsClient(client);

		expect(captured).toHaveLength(50);
	});
});

describe("identify", () => {
	test("is a no-op when no client is registered", () => {
		expect(() => identify("user-1", { email: "a@b.c" })).not.toThrow();
	});

	test("forwards the distinct id and properties", () => {
		const { client, identified } = buildClient();
		setAnalyticsClient(client);

		identify("user-1", { email: "a@b.c" });

		expect(identified).toEqual([
			{ distinctId: "user-1", properties: { email: "a@b.c" } },
		]);
	});

	test("is not queued while unconfigured", () => {
		identify("user-1");

		const { client, identified } = buildClient();
		setAnalyticsClient(client);

		expect(identified).toEqual([]);
	});
});

describe("resetIdentity", () => {
	test("is a no-op when no client is registered", () => {
		expect(() => resetIdentity()).not.toThrow();
	});

	test("resets the registered client", () => {
		const { client, reset } = buildClient();
		setAnalyticsClient(client);

		resetIdentity();

		expect(reset).toHaveBeenCalledTimes(1);
	});
});
