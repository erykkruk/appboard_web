import type { Metadata } from "next";

import { PublicSiteHeader } from "@/components/public/site-header";
import { AsoCheckFlow } from "@/components/aso-check/aso-check-flow";

export const metadata: Metadata = {
	description:
		"Paste your App Store or Google Play link and get a free ASO check-up in every market: keyword scores, your rankings, competition analysis, concrete fixes and a link to share. No account, computed in your browser.",
	title: "Free ASO Check-up in Every Market - AppBoard",
};

// Free no-account ASO check-up (like /editor): all App Store calls and all
// scoring run in the visitor's browser; only the resulting scores are sent
// to our public ingest endpoint.
export default function AsoCheckPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<PublicSiteHeader />
			<main className="flex-1 px-4">
				<AsoCheckFlow />
			</main>
		</div>
	);
}
