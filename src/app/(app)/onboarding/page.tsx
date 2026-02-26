"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  Play,
  Upload,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
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
import { Textarea } from "@/components/ui/textarea";
import { useConnectStore } from "@/hooks/use-stores";
import type { StoreType } from "@/lib/types";

const TOTAL_STEPS = 4;

function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={`step-${i + 1}`}
          className={`h-2 w-8 rounded-full transition-colors ${
            i + 1 <= currentStep ? "bg-foreground" : "bg-muted"
          }`}
        />
      ))}
    </div>
  );
}

function StoreTypeStep({
  onSelect,
  onDemo,
  isDemoLoading,
}: {
  onSelect: (type: StoreType) => void;
  onDemo: () => void;
  isDemoLoading: boolean;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card
          className="cursor-pointer transition-colors hover:border-foreground/30"
          onClick={() => onSelect("google_play")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a]">
                <span className="text-sm font-bold text-muted-foreground">GP</span>
              </div>
              Google Play
            </CardTitle>
            <CardDescription>
              Connect using a Service Account JSON key to manage your Android
              apps.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card
          className="cursor-pointer transition-colors hover:border-foreground/30"
          onClick={() => onSelect("app_store")}
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#2a2a2a]">
                <span className="text-sm font-bold text-muted-foreground">AS</span>
              </div>
              App Store
            </CardTitle>
            <CardDescription>
              Connect using App Store Connect API key to manage your iOS apps.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <Separator />

      <div className="rounded-lg border border-dashed p-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Demo Mode</p>
            <p className="text-xs text-muted-foreground">
              Try AppBoard with sample data. No API keys required.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onDemo}
            disabled={isDemoLoading}
          >
            {isDemoLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Try Demo
          </Button>
        </div>
      </div>
    </div>
  );
}

function GooglePlayCredentials({
  serviceAccountJson,
  onJsonChange,
}: {
  serviceAccountJson: string;
  onJsonChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          onJsonChange(content);
        }
      };
      reader.readAsText(file);
    },
    [onJsonChange],
  );

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">How to get credentials:</p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Go to Google Cloud Console</li>
            <li>Create a Service Account with Google Play Developer API access</li>
            <li>Generate a JSON key for the Service Account</li>
            <li>Grant the Service Account access in Google Play Console</li>
          </ol>
          <a
            href="https://developers.google.com/android-publisher/getting_started#using_a_service_account"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
          >
            Full setup guide
            <ExternalLink className="h-3 w-3" />
          </a>
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
          onChange={(e) => onJsonChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
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
    </div>
  );
}

function AppStoreCredentials({
  keyId,
  issuerId,
  privateKey,
  onKeyIdChange,
  onIssuerIdChange,
  onPrivateKeyChange,
}: {
  keyId: string;
  issuerId: string;
  privateKey: string;
  onKeyIdChange: (value: string) => void;
  onIssuerIdChange: (value: string) => void;
  onPrivateKeyChange: (value: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result;
        if (typeof content === "string") {
          onPrivateKeyChange(content);
        }
      };
      reader.readAsText(file);
    },
    [onPrivateKeyChange],
  );

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="space-y-3 p-4">
          <p className="text-sm font-medium">How to get credentials:</p>
          <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
            <li>Go to App Store Connect &rarr; Users and Access &rarr; Integrations</li>
            <li>Click &ldquo;Generate API Key&rdquo; (Admin role)</li>
            <li>Copy the Key ID and Issuer ID</li>
            <li>Download the .p8 private key file</li>
          </ol>
          <a
            href="https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-primary underline underline-offset-4"
          >
            Full setup guide
            <ExternalLink className="h-3 w-3" />
          </a>
        </CardContent>
      </Card>

      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="key-id">
          Key ID
        </label>
        <Input
          id="key-id"
          placeholder="e.g. ABC123DEFG"
          value={keyId}
          onChange={(e) => onKeyIdChange(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="issuer-id">
          Issuer ID
        </label>
        <Input
          id="issuer-id"
          placeholder="e.g. 12345678-1234-1234-1234-123456789012"
          value={issuerId}
          onChange={(e) => onIssuerIdChange(e.target.value)}
        />
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium" htmlFor="private-key">
          Private Key (.p8)
        </label>
        <Textarea
          id="private-key"
          placeholder="Paste your .p8 private key content here..."
          className="h-[150px] max-h-[150px] [field-sizing:fixed] overflow-y-auto font-mono text-xs"
          value={privateKey}
          onChange={(e) => onPrivateKeyChange(e.target.value)}
        />
      </div>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="mr-2 h-4 w-4" />
          Upload .p8 file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".p8"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>
    </div>
  );
}

function ConnectingStep() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="mb-4 h-12 w-12 animate-spin text-foreground" />
      <h3 className="text-lg font-semibold">Connecting...</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Verifying your credentials and fetching app data.
      </p>
    </div>
  );
}

function SuccessStep({ syncedApps, warnings }: { syncedApps: number; warnings: string[] }) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <CheckCircle2 className="mb-4 h-12 w-12 text-green-500" />
      <h3 className="text-lg font-semibold">Connected!</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Your store has been connected successfully.{" "}
        {syncedApps > 0
          ? `${syncedApps} app${syncedApps !== 1 ? "s" : ""} synced.`
          : "No apps were found during sync."}
      </p>
      {warnings.length > 0 && (
        <div className="mt-4 w-full max-w-md space-y-2">
          {warnings.map((warning) => (
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
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [storeType, setStoreType] = useState<StoreType | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);
  const [connectResult, setConnectResult] = useState<{ syncedApps: number; warnings: string[] } | null>(null);

  const [accountName, setAccountName] = useState("");
  const [serviceAccountJson, setServiceAccountJson] = useState("");
  const [keyId, setKeyId] = useState("");
  const [issuerId, setIssuerId] = useState("");
  const [privateKey, setPrivateKey] = useState("");

  const connectStore = useConnectStore();

  const handleStoreSelect = (type: StoreType) => {
    setStoreType(type);
    setStep(2);
  };

  const handleDemo = async () => {
    setIsDemoLoading(true);
    try {
      await connectStore.mutateAsync({
        name: "Demo Google Play",
        type: "google_play",
        credentials: { type: "mock", mock: true },
      });
      await connectStore.mutateAsync({
        name: "Demo App Store",
        type: "app_store",
        credentials: { mock: true },
      });
      toast.success("Demo stores connected with sample data!");
      router.push("/dashboard");
    } catch {
      toast.error("Failed to set up demo. Is the backend running?");
    } finally {
      setIsDemoLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!storeType) return;
    setStep(3);

    const name = accountName.trim() || (storeType === "google_play" ? "Google Play" : "App Store");

    let credentials: Record<string, string | boolean>;
    if (storeType === "google_play") {
      try {
        credentials = JSON.parse(serviceAccountJson);
      } catch {
        credentials = { type: "mock", mock: true };
      }
    } else {
      credentials = { keyId, issuerId, privateKey };
    }

    try {
      const result = await connectStore.mutateAsync({ name, type: storeType, credentials });
      setConnectResult({ syncedApps: result.syncedApps, warnings: result.warnings });
      setStep(4);
      toast.success(`Store connected! ${result.syncedApps} app${result.syncedApps !== 1 ? "s" : ""} synced.`);
    } catch {
      setStep(2);
      toast.error("Failed to connect store. Please check your credentials.");
    }
  };

  const hasName = accountName.trim().length > 0;
  const canConnect = hasName && (
    storeType === "google_play"
      ? serviceAccountJson.trim().length > 0
      : keyId.trim().length > 0 &&
        issuerId.trim().length > 0 &&
        privateKey.trim().length > 0
  );

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="Connect a Store" />
      <div className="mx-auto w-full max-w-2xl overflow-y-auto p-6">
        <div className="mb-8">
          <StepIndicator currentStep={step} totalSteps={TOTAL_STEPS} />
        </div>

        {step === 1 && (
          <div>
            <h2 className="mb-2 text-xl font-semibold">Choose Store Type</h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Select the platform you want to connect. You&apos;ll need API
              credentials to fetch your apps.
            </p>
            <StoreTypeStep
              onSelect={handleStoreSelect}
              onDemo={handleDemo}
              isDemoLoading={isDemoLoading}
            />
          </div>
        )}

        {step === 2 && storeType === "google_play" && (
          <div>
            <h2 className="mb-2 text-xl font-semibold">
              Google Play Credentials
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Provide your Service Account JSON key to access your apps.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium" htmlFor="account-name">
                Developer Account Name
              </label>
              <Input
                id="account-name"
                placeholder="e.g. My Company"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <GooglePlayCredentials
              serviceAccountJson={serviceAccountJson}
              onJsonChange={setServiceAccountJson}
            />
          </div>
        )}

        {step === 2 && storeType === "app_store" && (
          <div>
            <h2 className="mb-2 text-xl font-semibold">
              App Store Connect Credentials
            </h2>
            <p className="mb-6 text-sm text-muted-foreground">
              Provide your App Store Connect API key details.
            </p>
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium" htmlFor="account-name">
                Developer Account Name
              </label>
              <Input
                id="account-name"
                placeholder="e.g. My Company"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
              />
            </div>
            <AppStoreCredentials
              keyId={keyId}
              issuerId={issuerId}
              privateKey={privateKey}
              onKeyIdChange={setKeyId}
              onIssuerIdChange={setIssuerId}
              onPrivateKeyChange={setPrivateKey}
            />
          </div>
        )}

        {step === 3 && <ConnectingStep />}
        {step === 4 && <SuccessStep syncedApps={connectResult?.syncedApps ?? 0} warnings={connectResult?.warnings ?? []} />}

        {step === 2 && (
          <div className="mt-6 flex justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep(1);
                setStoreType(null);
                setAccountName("");
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleConnect} disabled={!canConnect}>
              Connect
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
