"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export type DeploymentMode = "cloud" | "selfhosted";

/**
 * Deployment edition of this AppBoard instance. "cloud" = our hosted SaaS
 * (cloud-only surfaces like billing are shown); "selfhosted" = hide them.
 * Fail-safe: anything other than an explicit "cloud" is treated as self-hosted.
 * The edition never changes at runtime, so the query is cached indefinitely.
 */
export function useDeploymentMode() {
	const { data, isLoading } = useQuery({
		queryKey: ["deployment-mode"],
		queryFn: async () => {
			const health = (await api.system.health()) as {
				deploymentMode?: string;
			};
			return health.deploymentMode === "cloud" ? "cloud" : "selfhosted";
		},
		staleTime: Number.POSITIVE_INFINITY,
	});

	const mode: DeploymentMode = data === "cloud" ? "cloud" : "selfhosted";
	return {
		isCloud: mode === "cloud",
		isLoading,
		isSelfHosted: mode === "selfhosted",
		mode,
	};
}
