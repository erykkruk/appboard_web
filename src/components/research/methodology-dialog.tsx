"use client";

import { HelpCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

/** "How scoring works" reference, mirrored from the backend methodology. */
export function MethodologyDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <HelpCircle className="mr-2 h-4 w-4" />
          How scoring works
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Keyword scoring methodology</DialogTitle>
          <DialogDescription>
            All scores derive from the public iTunes Search API (top 25 apps
            per keyword) - plus Apple&apos;s official dataset when Apple Ads is
            connected.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="mb-1 font-semibold">Popularity (1-100)</h3>
              <p className="text-muted-foreground">
                Estimates how often a keyword is searched, calibrated to
                Apple&apos;s own 1-100 scale. Signals: how many strong apps compete,
                the leaders&apos; review counts, how many titles target the keyword,
                market depth (median reviews) and a long-tail penalty for
                multi-word queries. With Apple Ads connected you can switch to
                Apple&apos;s official weekly values; keywords absent from the
                official dataset keep the estimate, capped below their own
                category&apos;s least-popular reported term.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-semibold">Difficulty (1-100)</h3>
              <p className="text-muted-foreground">
                How hard ranking would be: median review volume (30%), review
                velocity (10%), dominant players (20%), rating quality (10%),
                market age (10%), publisher diversity (10%) and title
                relevance (10%). The score self-corrects for Apple&apos;s search
                backfill: a weak #1 app caps it, keywords padded with
                unrelated giants get discounted, and brand keywords (the
                publisher matches the query) skip those corrections. Tiers
                show the same math for the Top 5, Top 10 and Top 20 slices.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-semibold">Opportunity + targeting</h3>
              <p className="text-muted-foreground">
                Opportunity = log-scaled search volume gated by a quadratic
                difficulty penalty; difficulty 100 always yields 0. Targeting
                labels combine the two: Sweet Spot (popular + beatable),
                Hidden Gem (moderate volume, minimal competition), Good
                Target, Moderate, High Competition, Low Volume, Avoid.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-semibold">Download estimates</h3>
              <p className="text-muted-foreground">
                Downloads = searches x tap-through rate x install conversion.
                The popularity-to-searches curve is anchored to Apple&apos;s
                official dataset (reported terms start around 500 searches per
                week); tap-through follows a power-law by position (#1 gets
                ~30% of taps, #20 under 0.1%); conversion is shown as a 5-20%
                range - which is why every figure is an interval, never a
                point. Volumes scale per storefront size.
              </p>
            </section>
            <section>
              <h3 className="mb-1 font-semibold">History and trends</h3>
              <p className="text-muted-foreground">
                Every search stores one snapshot per keyword, country and day
                (kept 90 days). Keywords tracked on an app refresh
                automatically every night, building daily trends; Apple Ads
                datasets add official week-over-week movement.
              </p>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
