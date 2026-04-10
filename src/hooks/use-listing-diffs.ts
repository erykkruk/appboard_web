"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { ListingDiff } from "@/lib/types";

export function useListingDiffs(appId: string, enabled = true) {
	return useQuery<ListingDiff[]>({
		queryKey: ["listing-diffs", appId],
		queryFn: () => api.listings.diffs(appId),
		enabled: enabled && !!appId,
	});
}
