"use client";

import { useRef } from "react";
import {
	Copy,
	Download,
	Ellipsis,
	RefreshCw,
	Sparkles,
	Upload,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ActionsMenuAction {
	key: string;
	label: string;
	icon: "sparkles" | "sync" | "download" | "upload" | "copy";
	disabled?: boolean;
	onSelect: () => void;
	/** Visually separates this item from the previous one */
	separatorBefore?: boolean;
}

interface ActionsMenuProps {
	actions: ActionsMenuAction[];
	/** If provided, renders a hidden file input and attaches it to the "import" action */
	importConfig?: {
		accept: string;
		onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
	};
}

const ICON_MAP = {
	sparkles: Sparkles,
	sync: RefreshCw,
	download: Download,
	upload: Upload,
	copy: Copy,
} as const;

export function ActionsMenu({ actions, importConfig }: ActionsMenuProps) {
	const fileInputRef = useRef<HTMLInputElement>(null);

	const resolvedActions = actions.map((action) => {
		if (action.key === "import" && importConfig) {
			return {
				...action,
				onSelect: () => fileInputRef.current?.click(),
			};
		}
		return action;
	});

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						size="sm"
						variant="ghost"
						className="h-8 w-8 p-0"
						aria-label="More actions"
					>
						<Ellipsis className="h-4 w-4" />
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end">
					{resolvedActions.map((action) => {
						const Icon = ICON_MAP[action.icon];
						return (
							<span key={action.key}>
								{action.separatorBefore && <DropdownMenuSeparator />}
								<DropdownMenuItem
									disabled={action.disabled}
									onSelect={action.onSelect}
								>
									<Icon className="mr-2 h-4 w-4" />
									{action.label}
								</DropdownMenuItem>
							</span>
						);
					})}
				</DropdownMenuContent>
			</DropdownMenu>

			{importConfig && (
				<input
					accept={importConfig.accept}
					className="hidden"
					onChange={importConfig.onChange}
					ref={fileInputRef}
					type="file"
				/>
			)}
		</>
	);
}
