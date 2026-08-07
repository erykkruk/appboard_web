"use client";

import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { storeCredentialSchema } from "@/lib/store-credentials";
import type { AlternativeStoreType } from "@/lib/stores";
import { storeTypeLabel } from "@/lib/stores";

interface StoreCredentialsFormProps {
  storeType: AlternativeStoreType;
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
}

export function StoreCredentialsForm({
  storeType,
  values,
  onChange,
}: StoreCredentialsFormProps) {
  const schema = storeCredentialSchema(storeType);
  const [revealed, setRevealed] = useState<string[]>([]);

  const toggleReveal = (key: string) =>
    setRevealed((current) =>
      current.includes(key)
        ? current.filter((k) => k !== key)
        : [...current, key],
    );

  return (
    <div className="space-y-4">
      <Card className="border-dashed">
        <CardContent className="flex items-start gap-3 p-4">
          <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Where to get these credentials</p>
            <p className="text-sm text-muted-foreground">{schema.where}</p>
          </div>
        </CardContent>
      </Card>

      {schema.fields.map((field) => {
        const fieldId = `${storeType}-${field.key}`;
        const value = values[field.key] ?? "";

        if (field.type === "pem") {
          return (
            <div key={field.key}>
              <Label className="mb-2 block" htmlFor={fieldId}>
                {field.label}
              </Label>
              <Textarea
                id={fieldId}
                placeholder={field.placeholder}
                className="h-[150px] max-h-[150px] [field-sizing:fixed] overflow-y-auto font-mono text-xs"
                value={value}
                onChange={(e) => onChange(field.key, e.target.value)}
              />
            </div>
          );
        }

        if (field.type === "secret") {
          const isRevealed = revealed.includes(field.key);
          return (
            <div key={field.key}>
              <Label className="mb-2 block" htmlFor={fieldId}>
                {field.label}
              </Label>
              <div className="relative">
                <Input
                  id={fieldId}
                  type={isRevealed ? "text" : "password"}
                  placeholder={field.placeholder}
                  value={value}
                  onChange={(e) => onChange(field.key, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  aria-label={
                    isRevealed ? `Hide ${field.label}` : `Show ${field.label}`
                  }
                  onClick={() => toggleReveal(field.key)}
                >
                  {isRevealed ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          );
        }

        return (
          <div key={field.key}>
            <Label className="mb-2 block" htmlFor={fieldId}>
              {field.label}
            </Label>
            <Input
              id={fieldId}
              placeholder={field.placeholder}
              value={value}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          </div>
        );
      })}

      <p className="text-xs text-muted-foreground">
        {storeTypeLabel(storeType)} credentials are stored in your end-to-end
        encrypted vault - we only keep an encrypted blob.
      </p>
    </div>
  );
}
