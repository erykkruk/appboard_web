"use client";

import Link from "next/link";
import { useState } from "react";

import {
	ArrowLeft,
	CheckCircle2,
	CloudCog,
	Copy,
	ExternalLink,
	Info,
	Terminal,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

const GCP_PROJECT_URL = "https://console.cloud.google.com/projectcreate";
const CLOUD_SHELL_URL = "https://shell.cloud.google.com";
const PLAY_CONSOLE_URL = "https://play.google.com/console/developers";

const SERVICE_ACCOUNT_NAME = "appboard-service-account";
const KEY_FILE_NAME = "appboard-key";

function generateScript(projectId: string): string {
	if (!projectId.trim()) {
		return "# Enter your Google Cloud Project ID above to generate the script";
	}

	return `#!/bin/bash

#================================================================================
# AppBoard — Google Play Service Credentials Setup
# Run in Google Cloud Shell: ${CLOUD_SHELL_URL}
#================================================================================

PROJECT_ID="${projectId.trim()}"
SERVICE_ACCOUNT_NAME="${SERVICE_ACCOUNT_NAME}"
KEY_FILE_NAME="${KEY_FILE_NAME}"

#================================================================================

set -e

echo_info() {
  echo -e "\\033[1;34m[INFO] \$1\\033[0m"
}
echo_success() {
  echo -e "\\033[1;32m[SUCCESS] \$1\\033[0m"
}
echo_warning() {
  echo -e "\\033[1;33m[WARNING] \$1\\033[0m"
}
echo_error() {
  echo -e "\\033[1;31m[ERROR] \$1\\033[0m"
}

echo_info "Starting Google Cloud setup for AppBoard integration..."

if [ "$PROJECT_ID" == "replace_project_id" ] || [ -z "$PROJECT_ID" ]; then
  echo_error "PROJECT_ID is not set. Please update it with your actual Google Cloud project ID."
  exit 1
fi

echo_info "Switching to project: $PROJECT_ID"
gcloud config set project $PROJECT_ID

echo_info "Enabling APIs needed for service account automation..."
gcloud services enable cloudresourcemanager.googleapis.com
sleep 2
gcloud services enable iam.googleapis.com
sleep 2

echo_info "Enabling Google Play required APIs..."
gcloud services enable androidpublisher.googleapis.com
sleep 2
gcloud services enable playdeveloperreporting.googleapis.com
sleep 2
gcloud services enable pubsub.googleapis.com

echo_success "APIs enabled successfully."

echo_info "Creating service account: $SERVICE_ACCOUNT_NAME"
gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \\
  --description="Service account for AppBoard integration" \\
  --display-name="AppBoard Service Account"
echo_success "Service account created successfully."

echo_info "Waiting 30s for service account to be available..."
sleep 30

echo_info "Granting roles to the service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/pubsub.editor"
echo_success "Pub/Sub Editor role assigned."

gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/monitoring.viewer"
echo_success "Monitoring Viewer role assigned."

echo_info "Generating service account key..."
gcloud iam service-accounts keys create $KEY_FILE_NAME.json \\
  --iam-account="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
echo_success "Service account key created: $KEY_FILE_NAME.json"
echo_info "Download this key and upload it to AppBoard in Settings > Google Play Setup."

echo_info "Verifying service account and key details..."
gcloud iam service-accounts list | grep $SERVICE_ACCOUNT_NAME

echo_info "Listing keys for the service account..."
gcloud iam service-accounts keys list \\
  --iam-account="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
echo_success "Setup complete! Download $KEY_FILE_NAME.json and upload it to AppBoard."

exit 0`;
}

function copyToClipboard(text: string, label: string) {
	navigator.clipboard.writeText(text).then(
		() => toast.success(`${label} copied to clipboard`),
		() => toast.error("Failed to copy to clipboard"),
	);
}

export default function GooglePlaySetupGuidePage() {
	const [projectId, setProjectId] = useState("");

	const serviceAccountEmail = projectId.trim()
		? `${SERVICE_ACCOUNT_NAME}@${projectId.trim()}.iam.gserviceaccount.com`
		: "";

	const script = generateScript(projectId);

	return (
		<div className="mx-auto w-full max-w-4xl space-y-6 p-6">
			<div>
				<Link
					href="/settings/google-play-setup"
					className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
				>
					<ArrowLeft className="h-3.5 w-3.5" />
					Back to Google Play Setup
				</Link>
				<h1 className="text-2xl font-bold tracking-tight">
					Google Play Setup Guide
				</h1>
				<p className="text-sm text-muted-foreground">
					Step-by-step guide to create Google Cloud service credentials for
					AppBoard.
				</p>
			</div>

			{/* Intro */}
			<Alert>
				<CloudCog className="h-4 w-4" />
				<AlertTitle>What you&apos;ll need</AlertTitle>
				<AlertDescription>
					This guide takes about 5 minutes. You&apos;ll need a Google Cloud
					account and admin access to Google Play Console. At the end,
					you&apos;ll have a JSON key file to upload in AppBoard.
				</AlertDescription>
			</Alert>

			{/* Step 1: Prerequisites */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Badge variant="secondary" className="tabular-nums">
							1
						</Badge>
						Prerequisites
					</CardTitle>
					<CardDescription>
						Make sure you have the following before starting.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<ul className="space-y-2 text-sm text-muted-foreground">
						<li className="flex items-start gap-2">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							A Google Cloud account with billing enabled
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							Admin access to Google Play Console
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
							A Google Cloud Project ID (existing or new)
						</li>
					</ul>
					<Separator />
					<p className="text-sm text-muted-foreground">
						Don&apos;t have a project yet?{" "}
						<a
							href={GCP_PROJECT_URL}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
						>
							Create a new Google Cloud project
							<ExternalLink className="h-3 w-3" />
						</a>
					</p>
				</CardContent>
			</Card>

			{/* Step 2: Run Script */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Badge variant="secondary" className="tabular-nums">
							2
						</Badge>
						Run Script in Google Cloud Shell
					</CardTitle>
					<CardDescription>
						Enter your Project ID, copy the generated script, and run it in
						Google Cloud Shell.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<label
							htmlFor="project-id"
							className="text-sm font-medium text-foreground"
						>
							Google Cloud Project ID
						</label>
						<Input
							id="project-id"
							placeholder="e.g. my-app-project-123456"
							value={projectId}
							onChange={(e) => setProjectId(e.target.value)}
						/>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<label className="text-sm font-medium text-foreground">
								Generated Script
							</label>
							<Button
								variant="outline"
								size="sm"
								disabled={!projectId.trim()}
								onClick={() => copyToClipboard(script, "Script")}
							>
								<Copy className="mr-1.5 h-3.5 w-3.5" />
								Copy Script
							</Button>
						</div>
						<pre className="max-h-72 overflow-auto rounded-lg border border-border bg-[#0a0a0a] p-4 font-mono text-xs leading-relaxed text-muted-foreground">
							{script}
						</pre>
					</div>

					<Alert>
						<Terminal className="h-4 w-4" />
						<AlertTitle>How to run</AlertTitle>
						<AlertDescription className="space-y-2">
							<ol className="list-inside list-decimal space-y-1 text-sm">
								<li>
									Open{" "}
									<a
										href={CLOUD_SHELL_URL}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
									>
										Google Cloud Shell
										<ExternalLink className="h-3 w-3" />
									</a>
								</li>
								<li>
									Create a file:{" "}
									<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
										nano appboard-setup.sh
									</code>
								</li>
								<li>Paste the script and save (Ctrl+X, Y, Enter)</li>
								<li>
									Run:{" "}
									<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
										bash appboard-setup.sh
									</code>
								</li>
								<li>
									Download the generated{" "}
									<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
										{KEY_FILE_NAME}.json
									</code>{" "}
									file
								</li>
							</ol>
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>

			{/* Step 3: Grant Permissions */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Badge variant="secondary" className="tabular-nums">
							3
						</Badge>
						Grant Permissions in Google Play Console
					</CardTitle>
					<CardDescription>
						Link the service account to your Google Play Console and grant the
						required permissions.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{serviceAccountEmail ? (
						<div className="space-y-2">
							<label className="text-sm font-medium text-foreground">
								Service Account Email
							</label>
							<div className="flex items-center gap-2">
								<code className="flex-1 truncate rounded-lg border border-border bg-[#0a0a0a] px-3 py-2 font-mono text-xs text-muted-foreground">
									{serviceAccountEmail}
								</code>
								<Button
									variant="outline"
									size="sm"
									onClick={() =>
										copyToClipboard(serviceAccountEmail, "Email")
									}
								>
									<Copy className="h-3.5 w-3.5" />
								</Button>
							</div>
						</div>
					) : (
						<p className="text-sm text-muted-foreground">
							Enter your Project ID in Step 2 to see the service account email.
						</p>
					)}

					<Separator />

					<ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
						<li>
							Go to{" "}
							<a
								href={PLAY_CONSOLE_URL}
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
							>
								Google Play Console
								<ExternalLink className="h-3 w-3" />
							</a>
						</li>
						<li>
							Navigate to{" "}
							<span className="font-medium text-foreground">
								Setup &rarr; API access
							</span>
						</li>
						<li>Link your Google Cloud project (if not already linked)</li>
						<li>
							Find the service account in the list and click Manage permissions
						</li>
						<li>
							Grant the following permissions:
							<ul className="mt-1.5 ml-5 list-disc space-y-1">
								<li>View app information and download bulk reports</li>
								<li>
									View financial data, orders, and cancellation survey responses
								</li>
								<li>Manage orders and subscriptions</li>
							</ul>
						</li>
						<li>
							Click{" "}
							<span className="font-medium text-foreground">Save</span> to
							apply
						</li>
					</ol>
				</CardContent>
			</Card>

			{/* Step 4: Upload */}
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Badge variant="secondary" className="tabular-nums">
							4
						</Badge>
						Upload Credentials
					</CardTitle>
					<CardDescription>
						Go back and upload the JSON key file to connect your store.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<Alert>
						<Info className="h-4 w-4" />
						<AlertTitle>Ready to connect?</AlertTitle>
						<AlertDescription>
							Once you have the{" "}
							<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
								{KEY_FILE_NAME}.json
							</code>{" "}
							file and have granted permissions in Play Console, go back to the
							setup page to upload and connect.
						</AlertDescription>
					</Alert>
					<Button asChild>
						<Link href="/settings/google-play-setup">
							<ArrowLeft className="mr-2 h-4 w-4" />
							Back to Google Play Setup
						</Link>
					</Button>
				</CardContent>
			</Card>
		</div>
	);
}
