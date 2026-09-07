import type { Metadata } from "next";

import { AsoCheckFlow } from "@/components/aso-check/aso-check-flow";
import { PublicSiteHeader } from "@/components/public/site-header";

export const metadata: Metadata = {
	description:
		"A shared ASO check-up from AppBoard: listing score, keyword ranks and next steps per market, exactly as they were measured.",
	// Visitor-generated snapshots: reachable by link, not by search engines.
	robots: { follow: true, index: false },
	title: "Shared ASO Check-up - AppBoard",
};

// A finished free check-up, opened from its share link. The snapshot is
// fetched and sanitized in the browser (see src/lib/aso-check/share.ts).
export default async function SharedAsoCheckPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;
	return (
		<div className="flex min-h-screen flex-col">
			<PublicSiteHeader />
			<main className="flex-1 px-4">
				<AsoCheckFlow reportId={id} />
			</main>
		</div>
	);
}
