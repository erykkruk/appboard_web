"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useApp } from "@/hooks/use-apps";

const PLANNED_METRICS = [
  "Purchases and revenue per day, week and month",
  "Revenue per product and per subscription",
  "Revenue per country",
  "Trials that turned into paying subscribers, renewals and cancellations",
  "Refunds",
];

/**
 * Sales measurement is not built yet. The page says so instead of showing
 * empty charts or sample numbers that could be read as real.
 */
export default function SalesPage() {
  const { appId } = useParams<{ appId: string }>();
  const app = useApp(appId);
  // Products are managed through the store API; a public-only app has none.
  const hasStoreApi = app.data?.store?.connectionMode !== "public";
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 p-6">
      <div className="flex items-center gap-3">
        <h1 className="font-bold text-xl tracking-tight">Sales</h1>
        <Badge variant="secondary">In progress</Badge>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">What this page will show</CardTitle>
          <CardDescription>
            Nothing is measured here yet, so there are no numbers on this page.
            The figures will come from the sales reports of App Store Connect
            and Google Play.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {PLANNED_METRICS.map((metric) => (
              <li key={metric}>{metric}</li>
            ))}
          </ul>
          {hasStoreApi && (
            <>
              <p className="text-sm text-muted-foreground">
                Creating and editing the products themselves stays in Store,
                under In-app products.
              </p>
              <Button asChild size="sm" variant="outline">
                <Link href={`/apps/${appId}/purchases`}>Open in-app products</Link>
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
