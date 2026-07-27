"use client";

import { useEffect } from "react";

import { identify, resetIdentity } from "@/lib/analytics";
import { useSession } from "@/lib/auth-client";

/**
 * Ties analytics events to the signed-in user and drops that identity again on
 * sign-out. Rendered inside the authenticated layout; a no-op when analytics is
 * not configured.
 */
export function PostHogIdentify() {
	const { data: session } = useSession();
	const userId = session?.user?.id;

	useEffect(() => {
		// Id only - the email adds nothing to signup/usage counts and would put
		// personal data in the analytics store for no reason.
		if (userId) {
			identify(userId);
			return;
		}
		resetIdentity();
	}, [userId]);

	return null;
}
