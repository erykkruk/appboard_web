"use client";

import { useParams } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useApp } from "@/hooks/use-apps";
import {
  useAgeRating,
  useAgeRatingPresets,
  useUpdateAgeRating,
} from "@/hooks/use-age-rating";

const QUESTION_LABELS: Record<string, string> = {
  CARTOON_FANTASY_VIOLENCE: "Cartoon or Fantasy Violence",
  REALISTIC_VIOLENCE: "Realistic Violence",
  PROLONGED_GRAPHIC_SADISTIC_REALISTIC_VIOLENCE:
    "Prolonged Graphic or Sadistic Realistic Violence",
  PROFANITY_CRUDE_HUMOR: "Profanity or Crude Humor",
  MATURE_SUGGESTIVE: "Mature/Suggestive Themes",
  HORROR_FEAR_THEMES: "Horror/Fear Themes",
  MEDICAL_TREATMENT_INFO: "Medical/Treatment Information",
  ALCOHOL_TOBACCO_DRUG_USE: "Alcohol, Tobacco, or Drug Use or References",
  SIMULATED_GAMBLING: "Simulated Gambling",
  SEXUAL_CONTENT_NUDITY: "Sexual Content or Nudity",
  GRAPHIC_SEXUAL_CONTENT_NUDITY: "Graphic Sexual Content and Nudity",
  UNRESTRICTED_WEB_ACCESS: "Unrestricted Web Access",
  GAMBLING_CONTESTS: "Gambling and Contests",
};

const ANSWER_LABELS: Record<string, string> = {
  NONE: "None",
  INFREQUENT_MILD: "Infrequent/Mild",
  FREQUENT_INTENSE: "Frequent/Intense",
};

const ANSWER_COLORS: Record<string, string> = {
  NONE: "text-green-400",
  INFREQUENT_MILD: "text-yellow-400",
  FREQUENT_INTENSE: "text-red-400",
};

function getAppStoreConnectUrl(externalId: string) {
  return `https://appstoreconnect.apple.com/apps/${externalId}/appstore/agerating`;
}

export default function AgeRatingPage() {
  const params = useParams<{ appId: string; versionId: string }>();
  const app = useApp(params.appId);
  const rating = useAgeRating(params.appId);
  const presets = useAgeRatingPresets();
  const updateRating = useUpdateAgeRating(params.appId);

  const [presetId, setPresetId] = useState("everyone");
  const [customApple, setCustomApple] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (rating.data !== undefined && !initialized) {
      if (rating.data) {
        setPresetId(rating.data.presetId);
        if (rating.data.presetId === "custom" && rating.data.appleQuestionnaire) {
          setCustomApple(rating.data.appleQuestionnaire);
        }
      }
      setInitialized(true);
    }
  }, [rating.data, initialized]);

  const selectedPreset = presets.data?.find((p) => p.id === presetId);

  const displayedQuestionnaire =
    presetId === "custom"
      ? customApple
      : selectedPreset?.appleQuestionnaire ?? {};

  const displayedAppleRating =
    presetId === "custom"
      ? rating.data?.appleRating ?? "4+"
      : selectedPreset?.appleRating ?? "4+";

  const displayedGoogleRating =
    presetId === "custom"
      ? rating.data?.googleRating ?? "EVERYONE"
      : selectedPreset?.googleRating ?? "EVERYONE";

  const handleSave = async () => {
    try {
      const result = await updateRating.mutateAsync({
        presetId,
        appleQuestionnaire: presetId === "custom" ? customApple : undefined,
      });

      if (result.syncedToStore) {
        toast.success("Age rating saved and synced to App Store Connect");
      } else if (result.syncError === "NO_EDITABLE_VERSION") {
        toast.warning(
          "Age rating saved locally, but could not sync to App Store Connect. Create a new app version first.",
          { duration: 6000 },
        );
      } else {
        toast.warning(
          "Age rating saved locally, but failed to sync to App Store Connect.",
          { duration: 5000 },
        );
      }
    } catch {
      toast.error("Failed to save age rating");
    }
  };

  const handleQuestionChange = (question: string, value: string) => {
    setCustomApple((prev) => ({ ...prev, [question]: value }));
  };

  if (rating.isLoading || presets.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const externalId = app.data?.externalId;
  const isIos = app.data?.platform === "ios";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Age Rating</h1>
        <div className="flex items-center gap-2">
          {isIos && externalId && (
            <Button variant="outline" size="sm" asChild>
              <a
                href={getAppStoreConnectUrl(externalId)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1.5 h-4 w-4" />
                App Store Connect
              </a>
            </Button>
          )}
          <Button
            onClick={handleSave}
            disabled={updateRating.isPending}
            size="sm"
          >
            {updateRating.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Save
          </Button>
        </div>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Info about ASC sync */}
        {isIos && (
          <Alert variant="default" className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm text-muted-foreground">
              Age rating changes can only be synced to App Store Connect when you
              have a version in <strong>Prepare for Submission</strong> state. If
              your app is already live without a draft version, create a new
              version first.
              {externalId && (
                <>
                  {" "}
                  <a
                    href={getAppStoreConnectUrl(externalId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-500 underline underline-offset-2 hover:text-yellow-400"
                  >
                    Open App Store Connect
                  </a>
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Preset Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-semibold">Preset</Label>
          <Select value={presetId} onValueChange={setPresetId}>
            <SelectTrigger className="w-80 bg-[#1a1a1a] border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {presets.data?.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedPreset && (
            <p className="text-sm text-muted-foreground">
              {selectedPreset.description}
            </p>
          )}
        </div>

        {/* Rating Summary */}
        <div className="flex gap-6">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Apple</Label>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {displayedAppleRating}
            </Badge>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Google</Label>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {displayedGoogleRating}
            </Badge>
          </div>
        </div>

        {/* Apple Questionnaire */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">
            Apple Content Descriptions
          </h2>
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-[#1a1a1a]">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Content Type
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground w-48">
                    Frequency
                  </th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(displayedQuestionnaire).map(
                  ([question, value]) => (
                    <tr
                      key={question}
                      className="border-b border-border last:border-b-0"
                    >
                      <td className="px-4 py-2">
                        {QUESTION_LABELS[question] ?? question}
                      </td>
                      <td className="px-4 py-2">
                        {presetId === "custom" ? (
                          <Select
                            value={value}
                            onValueChange={(v) =>
                              handleQuestionChange(question, v)
                            }
                          >
                            <SelectTrigger className="h-8 w-44 bg-[#1a1a1a] border-border text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NONE">None</SelectItem>
                              <SelectItem value="INFREQUENT_MILD">
                                Infrequent/Mild
                              </SelectItem>
                              <SelectItem value="FREQUENT_INTENSE">
                                Frequent/Intense
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <span
                            className={
                              ANSWER_COLORS[value] ?? "text-muted-foreground"
                            }
                          >
                            {ANSWER_LABELS[value] ?? value}
                          </span>
                        )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
