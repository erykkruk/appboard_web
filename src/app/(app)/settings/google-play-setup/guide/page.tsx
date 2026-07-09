"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

import {
	ArrowLeft,
	CheckCircle2,
	CloudCog,
	Copy,
	ExternalLink,
	Info,
	MousePointerClick,
	Sparkles,
	Terminal,
	TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { computeSetupPlan } from "@/components/stores/store-setup-plan";
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
import { useStoreCapabilityCatalog } from "@/hooks/use-stores";
import { cn } from "@/lib/utils";

const GCP_PROJECT_URL = "https://console.cloud.google.com/projectcreate";
const CLOUD_SHELL_URL = "https://shell.cloud.google.com";
const PLAY_CONSOLE_URL = "https://play.google.com/console/developers";

const SERVICE_ACCOUNT_NAME = "appboard-service-account";
const KEY_FILE_NAME = "appboard-key";

const DEFAULT_PLAY_APIS = [
	"androidpublisher.googleapis.com",
	"playdeveloperreporting.googleapis.com",
	"pubsub.googleapis.com",
];

const DEFAULT_PERMISSIONS = [
	"View app information and download bulk reports",
	"View financial data, orders, and cancellation survey responses",
	"Manage orders and subscriptions",
];

function generateScript(projectId: string, apis: string[]): string {
	if (!projectId.trim()) {
		return "# Enter your Google Cloud Project ID above to generate the script";
	}

	const playApis = apis.length > 0 ? apis : DEFAULT_PLAY_APIS;
	const enableBlock = playApis
		.map((apiName, i) =>
			i < playApis.length - 1
				? `gcloud services enable ${apiName}\nsleep 2`
				: `gcloud services enable ${apiName}`,
		)
		.join("\n");

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
${enableBlock}

echo_success "APIs enabled successfully."

echo_info "Creating service account: $SERVICE_ACCOUNT_NAME"
if gcloud iam service-accounts describe "$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" >/dev/null 2>&1; then
  echo_warning "Service account already exists — reusing it (script is safe to re-run)."
else
  gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \\
    --description="Service account for AppBoard integration" \\
    --display-name="AppBoard Service Account"
  echo_success "Service account created successfully."
  echo_info "Waiting 30s for service account to be available..."
  sleep 30
fi

echo_info "Granting roles to the service account..."
gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/pubsub.editor"
echo_success "Pub/Sub Editor role assigned."

gcloud projects add-iam-policy-binding $PROJECT_ID \\
  --member="serviceAccount:$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com" \\
  --role="roles/monitoring.viewer"
echo_success "Monitoring Viewer role assigned."

echo_info "Allowing service account key creation (Google blocks this by default via an org policy)..."
gcloud services enable orgpolicy.googleapis.com 2>/dev/null || true
# roles/owner does NOT include permission to change org policies — grant the
# current user Org Policy Administrator on this project first (owner can do this).
ACTIVE_ACCOUNT=$(gcloud config get-value account 2>/dev/null)
if [ -n "$ACTIVE_ACCOUNT" ]; then
  gcloud projects add-iam-policy-binding $PROJECT_ID \\
    --member="user:$ACTIVE_ACCOUNT" \\
    --role="roles/orgpolicy.policyAdmin" >/dev/null 2>&1 || true
  echo_info "Waiting 15s for the Org Policy Admin grant to propagate..."
  sleep 15
fi
# Override BOTH the legacy constraint and the newer "managed" constraint — Google
# migrated this control to iam.managed.disableServiceAccountKeyCreation, and if
# only the legacy one is disabled the managed one still blocks key creation.
POLICY_OK=false
for CONSTRAINT in iam.disableServiceAccountKeyCreation iam.managed.disableServiceAccountKeyCreation; do
  cat > /tmp/appboard-key-policy.yaml <<POLICY
name: projects/$PROJECT_ID/policies/$CONSTRAINT
spec:
  rules:
  - enforce: false
POLICY
  if gcloud org-policies set-policy /tmp/appboard-key-policy.yaml >/dev/null 2>&1; then
    echo_success "Override set for $CONSTRAINT."
    POLICY_OK=true
  else
    echo_warning "Could not override $CONSTRAINT (may not exist or is locked at the org level)."
  fi
done
if [ "$POLICY_OK" = "true" ]; then
  echo_info "Waiting 60s for the policy changes to propagate (managed policies are slower)..."
  sleep 60
else
  echo_warning "No org policy could be overridden — key creation is likely LOCKED at the organization level."
  echo_warning "You need an org admin (roles/orgpolicy.policyAdmin at the org), or use a Google account without a managed organization."
fi

echo_info "Generating service account key..."
KEY_OK=false
for attempt in 1 2 3; do
  set +e
  gcloud iam service-accounts keys create $KEY_FILE_NAME.json \\
    --iam-account="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"
  STATUS=$?
  set -e
  if [ $STATUS -eq 0 ]; then
    KEY_OK=true
    break
  fi
  echo_warning "Key creation failed (attempt $attempt/3) — waiting 15s in case the policy change is still propagating..."
  sleep 15
done
if [ "$KEY_OK" != "true" ]; then
  echo_error "Could not create the service account key after 3 attempts."
  echo_error "The org policy 'iam.disableServiceAccountKeyCreation' is blocking key creation and could not be turned off automatically."
  echo_error ""
  echo_error "FIX IT MANUALLY (see the 'Key creation failed?' section in the AppBoard guide):"
  echo_error "  1) Console > IAM & Admin > Organization Policies > 'Disable service account key creation'"
  echo_error "     (make sure THIS project is selected) > Manage policy > Override parent's policy > Off > Save."
  echo_error "  2) Wait ~2 min, then re-run this script (safe to re-run)."
  echo_error ""
  echo_error "If 'Manage policy' is greyed out, the policy is LOCKED at the organization level —"
  echo_error "you need roles/orgpolicy.policyAdmin, or ask your Google Cloud/Workspace org admin to allow it."
  echo_error "Alternatively, run this script in another project where key creation is allowed, then invite"
  echo_error "the service-account email in Play Console > Users and permissions."
  exit 1
fi
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

type SetupMode = "script" | "manual";

function GuideContent() {
	const [projectId, setProjectId] = useState("");
	const [mode, setMode] = useState<SetupMode>("script");
	const searchParams = useSearchParams();
	const catalog = useStoreCapabilityCatalog();

	const selected = useMemo(() => {
		const raw = searchParams.get("caps") ?? "";
		return raw
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
	}, [searchParams]);

	const gpCaps = useMemo(
		() =>
			catalog.data?.capabilities.filter((c) => c.storeType === "google_play") ??
			[],
		[catalog.data],
	);

	const plan = useMemo(
		() => computeSetupPlan(gpCaps, catalog.data?.setup.google_play, selected),
		[gpCaps, catalog.data, selected],
	);

	const hasSelection = selected.length > 0;
	const permissionItems =
		hasSelection && plan.roles.length > 0 ? plan.roles : DEFAULT_PERMISSIONS;

	const serviceAccountEmail = projectId.trim()
		? `${SERVICE_ACCOUNT_NAME}@${projectId.trim()}.iam.gserviceaccount.com`
		: "";

	const script = generateScript(projectId, hasSelection ? plan.apis : []);

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

			{hasSelection && (
				<Alert>
					<Sparkles className="h-4 w-4" />
					<AlertTitle>Tailored to your selection</AlertTitle>
					<AlertDescription>
						The script and permissions below cover the capabilities you
						picked when connecting.
					</AlertDescription>
				</Alert>
			)}

			{/* Mode toggle: automated script vs manual console steps */}
			<div className="space-y-2">
				<p className="text-sm font-medium text-foreground">
					How do you want to set this up?
				</p>
				<div className="grid grid-cols-2 gap-2">
					<button
						type="button"
						onClick={() => setMode("script")}
						className={cn(
							"flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
							mode === "script"
								? "border-primary bg-primary/5"
								: "border-border hover:bg-muted/50",
						)}
					>
						<span className="flex items-center gap-2 text-sm font-medium text-foreground">
							<Terminal className="h-4 w-4" />
							Automated (script)
						</span>
						<span className="text-xs text-muted-foreground">
							Copy one script, run it in Cloud Shell. Fastest.
						</span>
					</button>
					<button
						type="button"
						onClick={() => setMode("manual")}
						className={cn(
							"flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
							mode === "manual"
								? "border-primary bg-primary/5"
								: "border-border hover:bg-muted/50",
						)}
					>
						<span className="flex items-center gap-2 text-sm font-medium text-foreground">
							<MousePointerClick className="h-4 w-4" />
							Manual (Console)
						</span>
						<span className="text-xs text-muted-foreground">
							Click through the Google Cloud Console yourself.
						</span>
					</button>
				</div>
			</div>

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

			{/* Step 2 (script mode): Run Script */}
			{mode === "script" && (
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
			)}

			{/* Step 2 (manual mode): do it in the Console */}
			{mode === "manual" && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Badge variant="secondary" className="tabular-nums">
								2
							</Badge>
							Set up in the Google Cloud Console
						</CardTitle>
						<CardDescription>
							Prefer clicking through it yourself? Do these steps in the Console
							for your project.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-5 text-sm">
						<div className="space-y-2">
							<p className="font-medium text-foreground">a. Enable the APIs</p>
							<p className="text-muted-foreground">
								Open{" "}
								<a
									href="https://console.cloud.google.com/apis/library"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
								>
									APIs &amp; Services → Library
									<ExternalLink className="h-3 w-3" />
								</a>{" "}
								and enable{" "}
								<span className="text-foreground">
									Google Play Android Developer API
								</span>
								,{" "}
								<span className="text-foreground">
									Cloud Pub/Sub API
								</span>{" "}
								and{" "}
								<span className="text-foreground">
									Organization Policy API
								</span>
								.
							</p>
						</div>

						<Separator />

						<div className="space-y-2">
							<p className="font-medium text-foreground">
								b. Create the service account
							</p>
							<p className="text-muted-foreground">
								Go to{" "}
								<a
									href="https://console.cloud.google.com/iam-admin/serviceaccounts"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
								>
									IAM &amp; Admin → Service Accounts
									<ExternalLink className="h-3 w-3" />
								</a>{" "}
								→ <span className="text-foreground">Create service account</span>.
								Name it{" "}
								<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
									{SERVICE_ACCOUNT_NAME}
								</code>{" "}
								and click <span className="text-foreground">Done</span>.
							</p>
						</div>

						<Separator />

						<div className="space-y-2">
							<p className="font-medium text-foreground">c. Grant roles</p>
							<p className="text-muted-foreground">
								In{" "}
								<a
									href="https://console.cloud.google.com/iam-admin/iam"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
								>
									IAM &amp; Admin → IAM
									<ExternalLink className="h-3 w-3" />
								</a>{" "}
								→ <span className="text-foreground">Grant access</span>, add the
								service account email as principal and assign{" "}
								<span className="text-foreground">Pub/Sub Editor</span> and{" "}
								<span className="text-foreground">Monitoring Viewer</span>.
							</p>
						</div>

						<Separator />

						<div className="space-y-2">
							<p className="font-medium text-foreground">
								d. Allow key creation (org policy)
							</p>
							<p className="text-muted-foreground">
								Open{" "}
								<a
									href="https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
								>
									Organization Policies → &quot;Disable service account key
									creation&quot;
									<ExternalLink className="h-3 w-3" />
								</a>{" "}
								(project selected in the top picker) →{" "}
								<span className="text-foreground">Manage policy</span> →{" "}
								<span className="text-foreground">
									Override parent&apos;s policy
								</span>{" "}
								→ add a rule with enforcement{" "}
								<span className="text-foreground">Off</span> →{" "}
								<span className="text-foreground">Save</span>. If a banner points
								to the <span className="text-foreground">managed</span>{" "}
								constraint, repeat this for{" "}
								<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
									iam.managed.disableServiceAccountKeyCreation
								</code>{" "}
								too. See the troubleshooting section below if it&apos;s locked.
							</p>
						</div>

						<Separator />

						<div className="space-y-2">
							<p className="font-medium text-foreground">
								e. Create &amp; download the key
							</p>
							<p className="text-muted-foreground">
								Back in{" "}
								<span className="text-foreground">Service Accounts</span>, open
								the service account →{" "}
								<span className="text-foreground">Keys</span> →{" "}
								<span className="text-foreground">Add key → Create new key</span>{" "}
								→ <span className="text-foreground">JSON</span> →{" "}
								<span className="text-foreground">Create</span>. The{" "}
								<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
									.json
								</code>{" "}
								file downloads automatically — that&apos;s the file you upload to
								AppBoard.
							</p>
						</div>
					</CardContent>
				</Card>
			)}

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
								{permissionItems.map((permission) => (
									<li key={permission}>{permission}</li>
								))}
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

			{/* Troubleshooting: the org-policy key-creation block */}
			<Card className="border-amber-500/30">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<TriangleAlert className="h-4 w-4 text-amber-500" />
						Key creation failed? (&quot;Key creation is not allowed&quot;)
					</CardTitle>
					<CardDescription>
						If the script ends with{" "}
						<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
							FAILED_PRECONDITION: Key creation is not allowed on this service
							account
						</code>{" "}
						(constraint{" "}
						<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
							iam.disableServiceAccountKeyCreation
						</code>
						), Google is blocking key creation with an organization policy that
						the script could not turn off automatically. Here&apos;s how to fix
						it by hand.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 text-sm">
					<div className="space-y-2">
						<p className="font-medium text-foreground">
							Option A — Turn the policy off in the Console (recommended)
						</p>
						<ol className="ml-4 list-decimal space-y-1.5 text-muted-foreground">
							<li>
								Open{" "}
								<a
									href="https://console.cloud.google.com/iam-admin/orgpolicies/iam-disableServiceAccountKeyCreation"
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
								>
									IAM &amp; Admin → Organization Policies → &quot;Disable service
									account key creation&quot;
									<ExternalLink className="h-3 w-3" />
								</a>{" "}
								and make sure your project (not the org) is selected in the top
								project picker.
							</li>
							<li>
								Click <span className="text-foreground">Manage policy</span>.
							</li>
							<li>
								Choose{" "}
								<span className="text-foreground">
									Override parent&apos;s policy
								</span>{" "}
								(a.k.a. &quot;Customize&quot;).
							</li>
							<li>
								Add a rule with enforcement set to{" "}
								<span className="text-foreground">Off</span>, then{" "}
								<span className="text-foreground">Save</span>.
							</li>
							<li>
								Wait ~2 minutes for it to propagate, then re-run the script (it
								is safe to re-run).
							</li>
						</ol>
					</div>

					<Separator />

					<div className="space-y-2">
						<p className="font-medium text-foreground">
							If &quot;Manage policy&quot; is greyed out or Save is blocked
						</p>
						<p className="text-muted-foreground">
							The policy is locked at the{" "}
							<span className="text-foreground">organization</span> level and
							your account can&apos;t override it. You need the{" "}
							<code className="rounded bg-muted px-1.5 py-0.5 text-xs">
								roles/orgpolicy.policyAdmin
							</code>{" "}
							role at the organization, or ask whoever administers your Google
							Cloud organization / Google Workspace to allow key creation for
							this project.
						</p>
					</div>

					<Separator />

					<div className="space-y-2">
						<p className="font-medium text-foreground">
							Option B — Use a different Google Cloud project
						</p>
						<p className="text-muted-foreground">
							The service account does not have to live in a specific project —
							Google Play access is granted by inviting the service-account email
							in Play Console. If you have another project (e.g. a personal one)
							where key creation is allowed, run the script there instead, then
							invite that service-account email in{" "}
							<a
								href="https://play.google.com/console"
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
							>
								Play Console → Users and permissions
								<ExternalLink className="h-3 w-3" />
							</a>
							.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}


export default function GooglePlaySetupGuidePage() {
	return (
		<Suspense fallback={null}>
			<GuideContent />
		</Suspense>
	);
}
