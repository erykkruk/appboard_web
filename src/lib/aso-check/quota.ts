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
		const body = (await res.json()) as ConsumeResult;
		return body;
	} catch {
		return { allowed: true, limit: 0, remaining: 0, used: 0 };
	}
}
