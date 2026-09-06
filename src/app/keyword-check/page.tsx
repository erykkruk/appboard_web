import type { Metadata } from "next";

import { PublicSiteHeader } from "@/components/public/site-header";
import { KeywordCheckFlow } from "@/components/aso-check/keyword-check-flow";

export const metadata: Metadata = {
	description:
		"Free keyword difficulty checker for the App Store and Google Play: search popularity, competition difficulty, opportunity score and the apps ranking today. No account, computed in your browser.",
	title: "Free Keyword Difficulty Checker - AppBoard",
};

// Free no-account keyword difficulty checker. App Store data is fetched by
// the visitor's browser; Play goes through the cached public proxy.
export default function KeywordCheckPage() {
	return (
		<div className="flex min-h-screen flex-col">
			<PublicSiteHeader />
			<main className="flex-1 px-4">
				<KeywordCheckFlow />
			</main>
		</div>
	);
}
