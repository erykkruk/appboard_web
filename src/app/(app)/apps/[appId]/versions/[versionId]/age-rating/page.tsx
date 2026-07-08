"use client";

import { useParams } from "next/navigation";
import { AlertTriangle, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
  useGenerateAgeRating,
  useUpdateAgeRating,
} from "@/hooks/use-age-rating";
import { useAutoSave } from "@/hooks/use-auto-save";

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
  LOOT_BOX: "Loot Boxes",
  CONTESTS: "Contests",
  HEALTH_OR_WELLNESS_TOPICS: "Health or Wellness Topics",
  GUNS_OR_OTHER_WEAPONS: "Guns or Other Weapons",
  USER_GENERATED_CONTENT: "User Generated Content",
  PARENTAL_CONTROLS: "Parental Controls",
  GAMBLING: "Gambling",
  ADVERTISING: "Advertising",
  AGE_ASSURANCE: "Age Assurance",
  MESSAGING_AND_CHAT: "Messaging and Chat",
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
  const generateRating = useGenerateAgeRating(params.appId);

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

  const autoSaveData = useMemo(
    () => ({
      presetId,
      appleQuestionnaire: presetId === "custom" ? customApple : undefined,
    }),
    [presetId, customApple],
  );

  useAutoSave({
    data: autoSaveData,
    onSave: (data) => updateRating.mutateAsync(data),
    enabled: initialized,
  });

  const handleQuestionChange = (question: string, value: string) => {
    setCustomApple((prev) => ({ ...prev, [question]: value }));
  };

  const handleGenerate = async () => {
    try {
      const result = await generateRating.mutateAsync();
      setPresetId("custom");
      setCustomApple(result.appleQuestionnaire);
      toast.success("Age rating generated", {
        description: result.reasoning,
        duration: 8000,
      });
    } catch (err) {
      toast.error("Failed to generate age rating", {
        description: err instanceof Error ? err.message : "Unknown error",
      });
    }
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
    <div className="mx-auto w-full max-w-5xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Age Rating</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generateRating.isPending}
          >
            {generateRating.isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-1.5 h-4 w-4" />
            )}
            Generate with AI
          </Button>
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
        </div>
      </div>

      <div className="space-y-8">
        {/* Info about ASC sync */}
        {isIos && (
          <Alert variant="default" className="border-yellow-500/30 bg-yellow-500/5">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-sm text-muted-foreground">
              Age rating changes are saved locally. Use the Publish action to
              push them to App Store Connect when you have a version in{" "}
              <strong>Prepare for Submission</strong> state.
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

        {/* Preset + Rating Summary side by side on larger screens */}
        <div className="grid items-start gap-6 sm:grid-cols-2">
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
