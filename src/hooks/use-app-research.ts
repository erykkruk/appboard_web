"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { toast } from "sonner";

import { api, ApiError } from "@/lib/api";

const appRunsKey = (appId: string) => ["apps", appId, "research-runs"] as const;
const standaloneRunsKey = ["research", "runs"] as const;

// A fresh import auto-starts a background deep research run - poll lightly
// so it appears without a manual refresh, then stop.
const EMPTY_POLL_INTERVAL_MS = 20_000;
const EMPTY_POLL_WINDOW_MS = 5 * 60_000;

function isMissingKeyError(err: unknown): err is ApiError {
	return (
		err instanceof ApiError &&
		err.status === 400 &&
		err.message.includes("OpenRouter")
	);
}

// ── Per-app research runs ──────────────────────────────────────────

export function useAppResearchRuns(
	appId: string,
	opts?: { pollWhileEmpty?: boolean },
) {
	// Set on the first interval check (outside render, keeps the hook pure).
	const pollStartedAt = useRef<number | null>(null);
	const pollWhileEmpty = opts?.pollWhileEmpty ?? false;
	return useQuery({
		enabled: !!appId,
		queryFn: () => api.tracking.listRuns(appId),
		queryKey: appRunsKey(appId),
		refetchInterval: pollWhileEmpty
			? (query) => {
					pollStartedAt.current ??= Date.now();
					const empty = (query.state.data?.length ?? 0) === 0;
					const withinWindow =
						Date.now() - pollStartedAt.current < EMPTY_POLL_WINDOW_MS;
					return empty && withinWindow ? EMPTY_POLL_INTERVAL_MS : false;
				}
			: undefined,
	});
}

export function useAppResearchRun(appId: string, runId: string | null) {
	return useQuery({
		enabled: !!appId && !!runId,
		queryFn: () => api.tracking.getRun(appId, runId as string),
		queryKey: ["apps", appId, "research-runs", runId],
	});
}

export function useRunAppResearch(appId: string) {
	const queryClient = useQueryClient();
	const router = useRouter();
	return useMutation({
		mutationFn: (body: { country: string; deep?: boolean; keywords?: string[] }) =>
			api.tracking.runForApp(appId, body),
		onError: (err) => {
			if (isMissingKeyError(err)) {
				// Research still saves (heuristics + positions) without AI — just note it.
				toast.warning(err.message, {
					action: {
						label: "Open Settings",
						onClick: () => router.push("/settings"),
					},
				});
				return;
			}
			toast.error(err instanceof Error ? err.message : "Research failed");
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: appRunsKey(appId) });
		},
	});
}

export function useDeleteAppResearchRun(appId: string) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (runId: string) => api.tracking.deleteRun(appId, runId),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to delete run"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: appRunsKey(appId) });
		},
	});
}

// ── Standalone saved research (bottom tool) ────────────────────────

export function useStandaloneRuns() {
	return useQuery({
		queryFn: () => api.research.listRuns(),
		queryKey: standaloneRunsKey,
	});
}

export function useResearchRun(runId: string | null) {
	return useQuery({
		enabled: !!runId,
		queryFn: () => api.research.getRun(runId as string),
		queryKey: ["research", "runs", runId],
	});
}

export function useSaveResearchRun() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: Parameters<typeof api.research.saveRun>[0]) =>
			api.research.saveRun(body),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to save research"),
		onSuccess: () => {
			toast.success("Saved to research history");
			queryClient.invalidateQueries({ queryKey: standaloneRunsKey });
		},
	});
}

export function useDeleteResearchRun() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (runId: string) => api.research.deleteRun(runId),
		onError: (err) =>
			toast.error(err instanceof Error ? err.message : "Failed to delete run"),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: standaloneRunsKey });
		},
	});
}
