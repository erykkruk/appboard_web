"use client";

import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUpdateAppDevices } from "@/hooks/use-apps";
import { APP_DEVICES, type App, type AppDevice } from "@/lib/types";

const DEVICE_LABELS: Record<App["platform"], Record<AppDevice, string>> = {
  android: { phone: "Phone", tablet: "Tablet", tv: "Android TV" },
  ios: { phone: "iPhone", tablet: "iPad", tv: "Apple TV" },
};

const DEVICE_HINTS: Record<App["platform"], string> = {
  android:
    "If the Android TV build ships in this same package, tick Phone and Android TV. If it has its own package on Google Play, add that package as its own app and tick only Android TV. Rankings are measured in Google Play search.",
  ios: "Apple TV is part of the same App Store record as the iPhone app. Apple publishes no Apple TV search results, so rankings are measured in iPhone search, and an Apple TV only app cannot be rank-tracked.",
};

/**
 * Which devices the store record serves. Rank tracking reads this to stay
 * honest: there is no public Apple TV search to measure.
 */
export function AppDevicesCard({ app }: { app: App }) {
  const update = useUpdateAppDevices(app.id);
  const saved = app.devices?.length ? app.devices : (["phone"] as AppDevice[]);
  const [picked, setPicked] = useState<AppDevice[] | null>(null);
  const devices = picked ?? saved;
  const labels = DEVICE_LABELS[app.platform] ?? DEVICE_LABELS.android;
  const dirty =
    picked !== null &&
    [...picked].sort().join() !== [...saved].sort().join();

  function toggle(device: AppDevice, on: boolean) {
    const next = on
      ? [...devices, device]
      : devices.filter((d) => d !== device);
    setPicked(APP_DEVICES.filter((d) => next.includes(d)));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Devices</CardTitle>
        <CardDescription>
          {DEVICE_HINTS[app.platform] ?? DEVICE_HINTS.android}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-6">
          {APP_DEVICES.map((device) => {
            const id = `device-${device}`;
            return (
              <div key={device} className="flex items-center gap-2">
                <Checkbox
                  checked={devices.includes(device)}
                  id={id}
                  onCheckedChange={(value) => toggle(device, value === true)}
                />
                <Label htmlFor={id}>{labels[device]}</Label>
              </div>
            );
          })}
        </div>
        <Button
          disabled={!dirty || !devices.length || update.isPending}
          onClick={() =>
            update.mutate(devices, { onSuccess: () => setPicked(null) })
          }
        >
          {update.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Save devices
        </Button>
        {!devices.length && (
          <p className="text-sm text-muted-foreground">Pick at least one device.</p>
        )}
      </CardContent>
    </Card>
  );
}
