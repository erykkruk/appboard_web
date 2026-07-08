/**
 * Human-readable labels for listing fields. Single source of truth used by
 * history timeline, history page, push preview dialog, and any other UI that
 * needs to render a localized field name.
 */
export const LISTING_FIELD_LABELS: Record<string, string> = {
	fullDesc: "Full Description",
	keywords: "Keywords",
	marketingUrl: "Marketing URL",
	privacyUrl: "Privacy URL",
	promoText: "Promotional Text",
	shortDesc: "Short Description",
	supportUrl: "Support URL",
	title: "Title",
	whatsNew: "What's New",
};

export function getListingFieldLabel(field: string): string {
	return LISTING_FIELD_LABELS[field] ?? field;
}
