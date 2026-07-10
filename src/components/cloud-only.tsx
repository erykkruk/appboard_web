"use client";

import type { ReactNode } from "react";

import { useDeploymentMode } from "@/hooks/use-deployment-mode";

/**
 * Renders children only on our hosted cloud (DEPLOYMENT_MODE=cloud). On
 * self-hosted deployments the children are hidden (an optional `fallback` is
 * shown instead). Wrap cloud-only surfaces — e.g. billing / plan upgrade — in
 * this. Frontend counterpart to the backend `cloudOnly` feature flag.
 */
export function CloudOnly({
	children,
	fallback = null,
}: {
	children: ReactNode;
	fallback?: ReactNode;
}) {
	const { isCloud } = useDeploymentMode();
	return <>{isCloud ? children : fallback}</>;
}
