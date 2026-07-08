export type FieldHint = { description: string; example: string };

export const FIELD_HINTS: Record<string, FieldHint> = {
	category: {
		description: "App category as listed in the store.",
		example: "Productivity",
	},
	oneLiner: {
		description: "One-sentence tagline that captures what your app does.",
		example: "Track habits and build better routines",
	},
	problem: {
		description: "What user problem does your app solve?",
		example: "People struggle to build consistent daily habits",
	},
	mainBenefit: {
		description: "The #1 value proposition for your users.",
		example: "Build lasting habits with smart reminders",
	},
	keyFeatures: {
		description: "3-7 core features that define your app.",
		example: "Habit tracking, Streak counter, Reminders",
	},
	differentiator: {
		description: "What makes your app unique vs competitors?",
		example: "AI-powered suggestions based on lifestyle",
	},
	tone: {
		description: "Communication style used in store listings.",
		example: "Friendly, Motivating",
	},
	brandVoiceExample: {
		description: "A sentence that captures how your brand speaks.",
		example: "Small steps today, big changes tomorrow.",
	},
	wordsToInclude: {
		description: "Words your brand should always use.",
		example: "empower, effortless, smart",
	},
	wordsToAvoid: {
		description: "Words your brand should never use.",
		example: "cheap, basic, simple",
	},
	targetAudience: {
		description: "Ideal user profile — demographics and interests.",
		example: "Young professionals 25-35 who want to improve daily routines",
	},
	painPoints: {
		description: "User frustrations your app addresses.",
		example: "Forgetting habits, Losing motivation after a week",
	},
	userLanguage: {
		description: "How users naturally describe the problem your app solves.",
		example: "I keep forgetting to do my daily exercises",
	},
	competitors: {
		description: "Links to competitor apps in the stores.",
		example: "https://apps.apple.com/app/id123456",
	},
	competitiveAdvantage: {
		description: "Your key advantage over competitors.",
		example: "Only app with AI-generated habit suggestions",
	},
	positioning: {
		description: "How your app is positioned in the market.",
		example: "The smartest habit tracker for busy professionals",
	},
	downloadCount: {
		description: "Total download count for social proof.",
		example: "1M+",
	},
	awards: {
		description: "Awards or recognitions your app received.",
		example: "App of the Day, Best New App 2024",
	},
	pressQuotes: {
		description: "Notable press mentions or reviews.",
		example: '"The best habit app we\'ve tested" — TechCrunch',
	},
	testimonials: {
		description: "User testimonials or reviews.",
		example: '"Changed my morning routine completely!" — Sarah K.',
	},
	pricingModel: {
		description: "How your app is monetized.",
		example: "Freemium",
	},
	price: {
		description: "Pricing details for paid tiers.",
		example: "$4.99/month, $29.99/year",
	},
	freeFeatures: {
		description: "Features available in the free tier.",
		example: "3 habits, Basic reminders",
	},
	premiumFeatures: {
		description: "Features exclusive to paid users.",
		example: "Unlimited habits, AI suggestions, Analytics",
	},
	mustIncludeKeywords: {
		description: "Keywords that must appear in your store listing.",
		example: "habit tracker, daily routine",
	},
	longTailKeywords: {
		description: "Multi-word keyword phrases to target.",
		example: "best habit tracker app for beginners",
	},
	excludeKeywords: {
		description: "Keywords to avoid in your store listing.",
		example: "free, cheap, diet",
	},
};
