"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useCapabilities(appId: string) {
	return useQuery({
		queryKey: ["capabilities", appId],
		queryFn: () => api.apps.capabilities(appId),
		enabled: !!appId,
	});
}
