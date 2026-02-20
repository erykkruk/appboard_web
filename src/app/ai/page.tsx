"use client";

import {
  Bot,
  Check,
  Copy,
  FileText,
  Globe,
  Loader2,
  MessageSquare,
  Sparkles,
  Tag,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  useDraftReply,
  useGenerateDescription,
  useGenerateReleaseNotes,
  useSuggestKeywords,
  useTranslate,
} from "@/hooks/use-ai";
import type { AiResponse, StoreType } from "@/lib/types";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "pt", label: "Portuguese" },
  { value: "it", label: "Italian" },
  { value: "pl", label: "Polish" },
  { value: "ru", label: "Russian" },
  { value: "ar", label: "Arabic" },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button variant="ghost" size="sm" onClick={handleCopy}>
      {copied ? (
        <Check className="mr-1 h-3.5 w-3.5" />
      ) : (
        <Copy className="mr-1 h-3.5 w-3.5" />
      )}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

function AiResultBox({ data }: { data: AiResponse }) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {data.mock && (
            <Badge variant="outline" className="text-yellow-500">
              Mock Mode
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">
            Model: {data.model}
          </span>
        </div>
        <CopyButton text={data.result} />
      </div>
      <p className="text-sm whitespace-pre-wrap">{data.result}</p>
    </div>
  );
}

function TranslateSection() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLangs, setTargetLangs] = useState<string[]>([]);
  const [text, setText] = useState("");
  const translate = useTranslate();

  const toggleLang = (lang: string) => {
    setTargetLangs((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang],
    );
  };

  const handleTranslate = async () => {
    if (!text.trim() || targetLangs.length === 0) return;
    try {
      await translate.mutateAsync({ text, sourceLang, targetLangs });
      toast.success("Translation complete");
    } catch {
      toast.error("Translation failed. Check your AI settings.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Globe className="h-4 w-4" />
          Translate Listing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-1">
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="source-lang"
            >
              Source Language
            </label>
            <Select value={sourceLang} onValueChange={setSourceLang}>
              <SelectTrigger id="source-lang">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Target Languages
          </label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.filter((l) => l.value !== sourceLang).map((l) => (
              <Badge
                key={l.value}
                variant={targetLangs.includes(l.value) ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => toggleLang(l.value)}
              >
                {l.label}
              </Badge>
            ))}
          </div>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="translate-text"
          >
            Text to Translate
          </label>
          <Textarea
            id="translate-text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text to translate..."
            className="min-h-[100px]"
          />
        </div>

        <Button
          onClick={handleTranslate}
          disabled={
            !text.trim() || targetLangs.length === 0 || translate.isPending
          }
        >
          {translate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Globe className="mr-2 h-4 w-4" />
          )}
          Translate
        </Button>

        {translate.data && <AiResultBox data={translate.data} />}
      </CardContent>
    </Card>
  );
}

function GenerateDescriptionSection() {
  const [appName, setAppName] = useState("");
  const [platform, setPlatform] = useState<StoreType>("google_play");
  const [prompt, setPrompt] = useState("");
  const generate = useGenerateDescription();

  const handleGenerate = async () => {
    if (!prompt.trim() || !appName.trim()) return;
    try {
      await generate.mutateAsync({ prompt, appName, platform });
      toast.success("Description generated");
    } catch {
      toast.error("Generation failed. Check your AI settings.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Generate Description
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="gen-app-name"
            >
              App Name
            </label>
            <Input
              id="gen-app-name"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="My App"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="gen-platform"
            >
              Platform
            </label>
            <Select
              value={platform}
              onValueChange={(v) => setPlatform(v as StoreType)}
            >
              <SelectTrigger id="gen-platform">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google_play">Google Play</SelectItem>
                <SelectItem value="app_store">App Store</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="gen-prompt"
          >
            Prompt
          </label>
          <Textarea
            id="gen-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your app features, target audience..."
            className="min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!prompt.trim() || !appName.trim() || generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate
        </Button>

        {generate.data && <AiResultBox data={generate.data} />}
      </CardContent>
    </Card>
  );
}

function KeywordSuggestionsSection() {
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("en");
  const suggest = useSuggestKeywords();

  const handleSuggest = async () => {
    if (!description.trim()) return;
    try {
      await suggest.mutateAsync({
        description,
        platform: "google_play",
        language,
      });
      toast.success("Keywords suggested");
    } catch {
      toast.error("Failed to suggest keywords. Check your AI settings.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4" />
          Keyword Suggestions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="kw-desc">
            Description
          </label>
          <Textarea
            id="kw-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter your app description..."
            className="min-h-[80px]"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="kw-lang">
            Language
          </label>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger id="kw-lang" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((l) => (
                <SelectItem key={l.value} value={l.value}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleSuggest}
          disabled={!description.trim() || suggest.isPending}
        >
          {suggest.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Tag className="mr-2 h-4 w-4" />
          )}
          Suggest Keywords
        </Button>

        {suggest.data && <AiResultBox data={suggest.data} />}
      </CardContent>
    </Card>
  );
}

function DraftReplySection() {
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState("3");
  const [appName, setAppName] = useState("");
  const draft = useDraftReply();

  const handleDraft = async () => {
    if (!reviewText.trim() || !appName.trim()) return;
    try {
      await draft.mutateAsync({
        reviewText,
        rating: Number(rating),
        appName,
      });
      toast.success("Reply drafted");
    } catch {
      toast.error("Failed to draft reply. Check your AI settings.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageSquare className="h-4 w-4" />
          Draft Reply
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="dr-app"
            >
              App Name
            </label>
            <Input
              id="dr-app"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              placeholder="My App"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="dr-rating"
            >
              Review Rating
            </label>
            <Select value={rating} onValueChange={setRating}>
              <SelectTrigger id="dr-rating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5].map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} Star{r !== 1 ? "s" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="dr-text">
            Review Text
          </label>
          <Textarea
            id="dr-text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Paste the review text here..."
            className="min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleDraft}
          disabled={!reviewText.trim() || !appName.trim() || draft.isPending}
        >
          {draft.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Bot className="mr-2 h-4 w-4" />
          )}
          Draft Reply
        </Button>

        {draft.data && <AiResultBox data={draft.data} />}
      </CardContent>
    </Card>
  );
}

function ReleaseNotesSection() {
  const [changes, setChanges] = useState("");
  const [appName, setAppName] = useState("");
  const generate = useGenerateReleaseNotes();

  const handleGenerate = async () => {
    if (!changes.trim() || !appName.trim()) return;
    try {
      await generate.mutateAsync({ changes, appName });
      toast.success("Release notes generated");
    } catch {
      toast.error("Generation failed. Check your AI settings.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" />
          Release Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium" htmlFor="rn-app">
            App Name
          </label>
          <Input
            id="rn-app"
            value={appName}
            onChange={(e) => setAppName(e.target.value)}
            placeholder="My App"
          />
        </div>
        <div>
          <label
            className="mb-2 block text-sm font-medium"
            htmlFor="rn-changes"
          >
            Changelog / Changes
          </label>
          <Textarea
            id="rn-changes"
            value={changes}
            onChange={(e) => setChanges(e.target.value)}
            placeholder="List your changes..."
            className="min-h-[80px]"
          />
        </div>

        <Button
          onClick={handleGenerate}
          disabled={!changes.trim() || !appName.trim() || generate.isPending}
        >
          {generate.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Generate
        </Button>

        {generate.data && <AiResultBox data={generate.data} />}
      </CardContent>
    </Card>
  );
}

export default function AiPage() {
  return (
    <div className="flex flex-1 flex-col">
      <PageHeader title="AI Tools" />
      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        <div className="flex items-center gap-3 rounded-lg border border-dashed p-4">
          <Bot className="h-5 w-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            AI features require an OpenRouter API key. Configure it in{" "}
            <a
              href="/settings"
              className="text-primary underline underline-offset-4"
            >
              Settings
            </a>
            .
          </p>
        </div>

        <TranslateSection />
        <GenerateDescriptionSection />
        <KeywordSuggestionsSection />
        <DraftReplySection />
        <ReleaseNotesSection />
      </div>
    </div>
  );
}
