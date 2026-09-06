/**
 * Daily allowance of the free tools. The browser asks the backend before a
 * run and consumes units up front; the backend counts each visitor by hashed
 * IP and by a cookie id, so clearing one does not reset the day.
 */
export type FreeTool = "aso-check" | "keyword-check";

export interface QuotaState {
	limit: number;
	remaining: number;
	used: number;
}

export type QuotaStatus = Record<FreeTool, QuotaState>;

export interface ConsumeResult extends QuotaState {
	allowed: boolean;
}

export async function fetchQuota(): Promise<QuotaStatus | null> {
	try {
		const res = await fetch("/api/public/quota", { credentials: "include" });
		if (!res.ok) return null;
		return (await res.json()) as QuotaStatus;
	} catch {
		return null;
	}
}

/**
 * Reserve `units` of a tool's daily allowance. A network failure resolves as
 * allowed: the quota protects our costs, it should never break the tool for
 * someone whose connection hiccupped.
 */
export async function consumeQuota(
	tool: FreeTool,
	units = 1,
): Promise<ConsumeResult> {
	try {
		const res = await fetch("/api/public/quota/consume", {
			body: JSON.stringify({ tool, units }),
			credentials: "include",
			headers: { "Content-Type": "application/json" },
			method: "POST",
		});
		// Only "used up" (429) may say no. Any other non-OK answer - a backend
		// that predates the quota route answers 404 with a JSON body - has no
		// verdict in it, and the free tool must not stop on an undefined.
		if (!res.ok && res.status !== 429) {
			return { allowed: true, limit: 0, remaining: 0, used: 0 };
		}
		const body = (await res.json()) as Partial<ConsumeResult>;
		if (typeof body.allowed !== "boolean") {
			return { allowed: true, limit: 0, remaining: 0, used: 0 };
		}
		return {
			allowed: body.allowed,
			limit: body.limit ?? 0,
			remaining: body.remaining ?? 0,
			used: body.used ?? 0,
		};
	} catch {
		return { allowed: true, limit: 0, remaining: 0, used: 0 };
	}
}
