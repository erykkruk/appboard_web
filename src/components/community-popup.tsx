"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { useDeploymentMode } from "@/hooks/use-deployment-mode";
import { capture } from "@/lib/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics-events";

export const COMMUNITY_DISCORD_URL = "https://discord.gg/3VpCwukDE3";
export const COMMUNITY_REDDIT_URL = "https://www.reddit.com/r/appboard/";

const DISMISSED_STORAGE_KEY = "appboard.community-popup.dismissed";
/** Delay before the invite slides in — let the page settle first. */
const SHOW_DELAY_MS = 1500;

/**
 * Bottom-of-page invite to the AppBoard community (Discord + Reddit), shown on
 * the free surfaces (free editor, self-hosted panel). Dismissable once per
 * browser via localStorage; renders nothing until mounted so SSR markup never
 * flashes it.
 */
export function CommunityPopup({ delayMs = SHOW_DELAY_MS }: { delayMs?: number }) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		try {
			if (window.localStorage.getItem(DISMISSED_STORAGE_KEY) === "1") return;
		} catch {
			// Storage blocked — still show the invite, just without persistence.
		}
		const timer = window.setTimeout(() => {
			setVisible(true);
			capture(ANALYTICS_EVENTS.COMMUNITY_POPUP_SHOWN);
		}, delayMs);
		return () => window.clearTimeout(timer);
	}, [delayMs]);

	if (!visible) return null;

	const dismiss = () => {
		setVisible(false);
		capture(ANALYTICS_EVENTS.COMMUNITY_POPUP_DISMISSED);
		try {
			window.localStorage.setItem(DISMISSED_STORAGE_KEY, "1");
		} catch {
			// Best-effort only.
		}
	};

	return (
		<div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
			<div className="flex w-full max-w-xl items-center gap-3 rounded-lg border border-border bg-background/95 p-3 shadow-lg backdrop-blur">
				<MessageCircle className="h-5 w-5 shrink-0 text-primary" />
				<p className="min-w-0 flex-1 text-xs text-muted-foreground sm:text-sm">
					Enjoying AppBoard? Join our community and help shape the product —
					feature requests, feedback and early previews.
				</p>
				<div className="flex shrink-0 items-center gap-2">
					<Button size="sm" variant="outline" asChild>
						<a
							href={COMMUNITY_DISCORD_URL}
							target="_blank"
							rel="noreferrer"
							onClick={() =>
								capture(ANALYTICS_EVENTS.COMMUNITY_POPUP_LINK_CLICKED, {
									target: "discord",
								})
							}
						>
							Discord
						</a>
					</Button>
					<Button size="sm" variant="outline" asChild>
						<a
							href={COMMUNITY_REDDIT_URL}
							target="_blank"
							rel="noreferrer"
							onClick={() =>
								capture(ANALYTICS_EVENTS.COMMUNITY_POPUP_LINK_CLICKED, {
									target: "reddit",
								})
							}
						>
							Reddit
						</a>
					</Button>
					<button
						type="button"
						onClick={dismiss}
						aria-label="Dismiss community invite"
						className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
					>
						<X className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
}

/** Community invite shown only on self-hosted (free) deployments. */
export function SelfHostedCommunityPopup() {
	const { isSelfHosted, isLoading } = useDeploymentMode();
	if (isLoading || !isSelfHosted) return null;
	return <CommunityPopup />;
}
