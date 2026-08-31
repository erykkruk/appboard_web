import type { Metadata } from "next";

import { AsoCheckFlow } from "@/components/aso-check/aso-check-flow";

export const metadata: Metadata = {
	description:
		"Paste your App Store link and get a free ASO check-up: keyword scores, your rankings, competition analysis and concrete fixes. No account, computed in your browser.",
	title: "Free ASO Check-up - AppBoard",
};

// Free no-account ASO check-up (like /editor): all App Store calls and all
// scoring run in the visitor's browser; only the resulting scores are sent
// to our public ingest endpoint.
export default function AsoCheckPage() {
	return (
		<div className="min-h-screen px-4">
			<AsoCheckFlow />
		</div>
	);
}
