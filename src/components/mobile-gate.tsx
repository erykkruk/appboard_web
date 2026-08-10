"use client";

import { ArrowLeft, MonitorSmartphone } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

const DEFAULT_BACK_HREF = "/dashboard";
const DEFAULT_BACK_LABEL = "Back to dashboard";

/**
 * Blocks views that need a desktop (canvas editors, drag-and-drop boards,
 * wide tables) below the `md` breakpoint and shows a plain explanation instead.
 *
 * The swap is done in CSS (`md:hidden` / `hidden md:contents`) so the server
 * render already matches both viewports and desktop never flashes the message.
 * `useIsMobile` only kicks in after hydration, to unmount the heavy view on
 * phones instead of leaving it mounted behind `display: none`.
 */
export function MobileGate({
	children,
	backHref = DEFAULT_BACK_HREF,
	backLabel = DEFAULT_BACK_LABEL,
}: {
	children: ReactNode;
	backHref?: string;
	backLabel?: string;
}) {
	const isMobile = useIsMobile();

	return (
		<>
			<div className="flex min-h-[100dvh] flex-1 items-center justify-center bg-background px-6 md:hidden">
				<div className="flex max-w-sm flex-col items-center text-center">
					<div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border/50 bg-card">
						<MonitorSmartphone
							className="h-8 w-8 text-muted-foreground"
							strokeWidth={1.5}
						/>
					</div>
					<h1 className="mb-3 text-xl font-bold tracking-tight">
						Not supported on mobile yet
					</h1>
					<p className="mb-8 text-sm leading-relaxed text-muted-foreground">
						This view needs a bigger screen - open AppBoard on a desktop to use
						it.
					</p>
					<Button asChild>
						<Link href={backHref}>
							<ArrowLeft className="h-4 w-4" />
							{backLabel}
						</Link>
					</Button>
				</div>
			</div>
			<div className="hidden md:contents">{isMobile ? null : children}</div>
		</>
	);
}
