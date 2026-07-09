"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";

import {
	ArrowLeft,
	ArrowRight,
	CheckCircle2,
	ExternalLink,
	Loader2,
	Upload,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useConnectStore } from "@/hooks/use-stores";

export default function GooglePlaySetupPage() {
	const router = useRouter();
	const fileInputRef = useRef<HTMLInputElement>(null);

	const [accountName, setAccountName] = useState("");
	const [serviceAccountJson, setServiceAccountJson] = useState("");
	const [isConnecting, setIsConnecting] = useState(false);
	const [connectResult, setConnectResult] = useState<{
		syncedApps: number;
		warnings: string[];
	} | null>(null);

	const connectStore = useConnectStore();

	const handleFileUpload = useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (e) => {
				const content = e.target?.result;
				if (typeof content === "string") {
					try {
						JSON.parse(content);
						setServiceAccountJson(content);
						toast.success("JSON file loaded");
					} catch {
						toast.error("Invalid JSON file");
					}
				}
			};
			reader.readAsText(file);
			event.target.value = "";
		},
		[],
	);

	const handleConnect = async () => {
		if (!accountName.trim() || !serviceAccountJson.trim()) return;

		let credentials: Record<string, string | boolean>;
		try {
			credentials = JSON.parse(serviceAccountJson);
		} catch {
			toast.error("Invalid JSON — please check the credentials format");
			return;
		}

		setIsConnecting(true);
		try {
			const result = await connectStore.mutateAsync({
				name: accountName.trim(),
				type: "google_play",
				credentials,
			});
			setConnectResult({
				syncedApps: result.syncedApps,
				warnings: result.warnings,
			});
			toast.success(
				`Store connected! ${result.syncedApps} app${result.syncedApps !== 1 ? "s" : ""} synced.`,
			);
		} catch {
			toast.error("Failed to connect store. Please check your credentials.");
		} finally {
			setIsConnecting(false);
		}
	};

	const canConnect =
		accountName.trim().length > 0 && serviceAccountJson.trim().length > 0;

	if (isConnecting) {
		return (
			<div className="mx-auto w-full max-w-4xl p-6">
				<div className="flex flex-col items-center justify-center py-12">
					<Loader2 className="mb-4 h-12 w-12 animate-spin text-foreground" />
					<h3 className="text-lg font-semibold">Connecting...</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						Verifying your credentials and fetching app data.
					</p>
				</div>
			</div>
		);
	}

	if (connectResult) {
		return (
			<div className="mx-auto w-full max-w-4xl p-6">
				<div className="flex flex-col items-center justify-center py-12">
					<CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
					<h3 className="text-lg font-semibold">Connected!</h3>
					<p className="mt-2 text-sm text-muted-foreground">
						Your store has been connected successfully.{" "}
						{connectResult.syncedApps > 0
							? `${connectResult.syncedApps} app${connectResult.syncedApps !== 1 ? "s" : ""} synced.`
							: "No apps were found during sync."}
					</p>
					{connectResult.warnings.length > 0 && (
						<div className="mt-4 w-full max-w-md space-y-2">
							{connectResult.warnings.map((warning) => (
								<div
									key={warning}
									className="rounded-lg border border-yellow-500/20 bg-yellow-500/5 p-3 text-left text-xs text-yellow-200"
								>
									{warning}
								</div>
							))}
						</div>
					)}
					<Button className="mt-6" onClick={() => router.push("/dashboard")}>
						Go to Dashboard
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-4xl space-y-6 p-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">
					Google Play Credentials
				</h1>
				<p className="text-sm text-muted-foreground">
					Provide your Service Account JSON key to access your apps.
				</p>
			</div>

			<div>
				<label
					className="mb-2 block text-sm font-medium"
					htmlFor="account-name"
				>
					Developer Account Name
				</label>
				<Input
					id="account-name"
					placeholder="e.g. My Company"
					value={accountName}
					onChange={(e) => setAccountName(e.target.value)}
				/>
			</div>

			<Card className="border-dashed">
				<CardContent className="space-y-3 p-4">
					<p className="text-sm font-medium">How to get credentials:</p>
					<ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
						<li>Go to Google Cloud Console</li>
						<li>
							Create a Service Account with Google Play Developer API access
						</li>
						<li>Generate a JSON key for the Service Account</li>
						<li>Grant the Service Account access in Google Play Console</li>
					</ol>
					<Link
						href="/settings/google-play-setup/guide"
						className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
					>
						Full setup guide
						<ExternalLink className="h-3 w-3" />
					</Link>
				</CardContent>
			</Card>

			<Card className="border-dashed">
				<CardContent className="space-y-2 p-4">
					<p className="text-sm font-medium">
						Ran the setup script in Cloud Shell?
					</p>
					<p className="text-sm text-muted-foreground">
						Download the generated key to your computer, then upload it below.
						In the Cloud Shell terminal run:
					</p>
					<code className="block rounded-lg border border-border bg-[#0a0a0a] px-3 py-2 font-mono text-xs text-muted-foreground">
						cloudshell download appboard-key.json
					</code>
					<p className="text-sm text-muted-foreground">
						A browser download opens. Alternatively, right-click{" "}
						<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
							appboard-key.json
						</code>{" "}
						in the Cloud Shell Editor file tree and choose{" "}
						<span className="text-foreground">Download</span>.
					</p>
				</CardContent>
			</Card>

			<div>
				<label className="mb-2 block text-sm font-medium" htmlFor="sa-json">
					Service Account JSON
				</label>
				<Textarea
					id="sa-json"
					placeholder="Paste your Service Account JSON here or upload a .json file..."
					className="h-[200px] max-h-[200px] [field-sizing:fixed] overflow-y-auto font-mono text-xs"
					value={serviceAccountJson}
					onChange={(e) => setServiceAccountJson(e.target.value)}
				/>
			</div>

			<div className="flex items-center gap-4">
				<Button
					variant="outline"
					onClick={() => fileInputRef.current?.click()}
				>
					<Upload className="mr-2 h-4 w-4" />
					Upload .json file
				</Button>
				<input
					ref={fileInputRef}
					type="file"
					accept=".json"
					className="hidden"
					onChange={handleFileUpload}
				/>
			</div>

			<div className="flex justify-between">
				<Button variant="outline" onClick={() => router.push("/settings")}>
					<ArrowLeft className="mr-2 h-4 w-4" />
					Back
				</Button>
				<Button onClick={handleConnect} disabled={!canConnect}>
					Connect
					<ArrowRight className="ml-2 h-4 w-4" />
				</Button>
			</div>
		</div>
	);
}
