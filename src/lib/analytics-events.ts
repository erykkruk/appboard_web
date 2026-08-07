/**
 * Every product-analytics event name lives here - event names are a contract
 * with the PostHog dashboards, so they must never be inlined as string
 * literals at the call site. snake_case, PostHog's convention.
 */
export const ANALYTICS_EVENTS = {
	/** PostHog's built-in pageview - captured manually because of the App Router. */
	PAGEVIEW: "$pageview",

	/** Guest opened the free (no-account) screenshot editor. */
	FREE_EDITOR_OPENED: "free_editor_opened",
	/** Guest downloaded a rendered screenshot from the free editor. */
	FREE_EDITOR_EXPORT: "free_editor_export",
	/** The "create a free account" dialog became visible in the free editor. */
	FREE_EDITOR_ACCOUNT_PROMPT_SHOWN: "free_editor_account_prompt_shown",
	/** Guest clicked a sign-up / log-in button inside that dialog. */
	FREE_EDITOR_SIGNUP_CTA_CLICKED: "free_editor_signup_cta_clicked",

	/** A session was successfully established (OTP or password). */
	LOGIN_COMPLETED: "login_completed",
	/** An OAuth redirect was started - completion happens off-site. */
	LOGIN_SOCIAL_STARTED: "login_social_started",

	/** The community (Discord/Reddit) invite popup became visible. */
	COMMUNITY_POPUP_SHOWN: "community_popup_shown",
	/** A community link was clicked - property `target`: "discord" | "reddit". */
	COMMUNITY_POPUP_LINK_CLICKED: "community_popup_link_clicked",
	/** The community popup was dismissed with the X button. */
	COMMUNITY_POPUP_DISMISSED: "community_popup_dismissed",
} as const;

export type AnalyticsEvent =
	(typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];
