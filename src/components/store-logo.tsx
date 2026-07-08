import { cn } from "@/lib/utils";
import type { StoreType } from "@/lib/types";

const APPLE_LOGO_PATH =
	"M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z";

const GOOGLE_PLAY_PATHS: { d: string; fill: string }[] = [
	{
		d: "M3 20.5V3.5C3 2.91 3.34 2.39 3.84 2.15L13.69 12L3.84 21.85C3.34 21.6 3 21.09 3 20.5Z",
		fill: "#4285F4",
	},
	{
		d: "M16.81 15.12L6.05 21.34L14.54 12.85L16.81 15.12Z",
		fill: "#EA4335",
	},
	{
		d: "M20.16 10.81C20.5 11.08 20.75 11.5 20.75 12C20.75 12.5 20.53 12.9 20.18 13.18L17.89 14.5L15.39 12L17.89 9.5L20.16 10.81Z",
		fill: "#FBBC04",
	},
	{
		d: "M6.05 2.66L16.81 8.88L14.54 11.15L6.05 2.66Z",
		fill: "#34A853",
	},
];

interface StoreLogoProps {
	type: StoreType;
	className?: string;
	/** Render the Google Play mark with currentColor instead of brand colors. */
	monochrome?: boolean;
}

export function StoreLogo({ type, className, monochrome = false }: StoreLogoProps) {
	if (type === "app_store") {
		return (
			<svg
				viewBox="0 0 24 24"
				fill="currentColor"
				className={cn("h-4 w-4 shrink-0", className)}
				aria-hidden="true"
			>
				<path d={APPLE_LOGO_PATH} />
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 24 24"
			className={cn("h-4 w-4 shrink-0", className)}
			aria-hidden="true"
		>
			{GOOGLE_PLAY_PATHS.map((p) => (
				<path key={p.fill} d={p.d} fill={monochrome ? "currentColor" : p.fill} />
			))}
		</svg>
	);
}
