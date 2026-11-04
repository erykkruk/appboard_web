"use client";

import { AlertTriangle, Info, Loader2, RefreshCw, Tv } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { marketLabel } from "@/lib/markets";
import {
  formatConversion,
  formatCount,
  monthLabel,
  PLAY_BULK_REPORTS_PERMISSION,
  PLAY_REPORTS_BUCKET_HINT,
} from "@/lib/store-performance";
import type {
  StoreFunnel,
  StorePerformanceMonth,
  StorePerformanceReport,
  StorePerformanceResponse,
} from "@/lib/types";

export interface StorePerformanceViewProps {
  error: Error | null;
  isLoading: boolean;
  isRefreshing: boolean;
  month: string | null;
  onEditBucket: () => void;
  onMonthChange: (month: string) => void;
  onRefresh: () => void;
  report: StorePerformanceResponse | undefined;
}

const COUNTRY_CODE = /^[a-z]{2}$/i;

function countryName(code: string): string {
  return COUNTRY_CODE.test(code) ? marketLabel(code.toLowerCase()) : code;
}

interface FunnelRow extends StoreFunnel {
  key: string;
  label: ReactNode;
}

/** Visitors, acquisitions and conversion for one dimension of the month. */
function FunnelTable({
  firstColumn,
  label,
  rows,
}: {
  firstColumn: string;
  label: string;
  rows: FunnelRow[];
}) {
  return (
    <Table aria-label={label}>
      <TableHeader>
        <TableRow>
          <TableHead>{firstColumn}</TableHead>
          <TableHead className="text-right" title="People who opened the store listing">
            Visitors
          </TableHead>
          <TableHead
            className="text-right"
            title="Visitors who installed the app from the listing"
          >
            Acquisitions
          </TableHead>
          <TableHead className="text-right" title="Acquisitions divided by visitors">
            Conversion
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="max-w-[18rem] truncate">{row.label}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCount(row.visitors)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCount(row.acquisitions)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {formatConversion(row.conversionRate)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-2xl tabular-nums">{value}</p>
    </div>
  );
}

function SetupSteps({ email }: { email: string | null }) {
  return (
    <ol className="list-decimal space-y-1 pl-5 text-sm">
      <li>
        In Play Console open Users and permissions and select{" "}
        {email ? <code className="break-all">{email}</code> : "the service account of this connection"}.
      </li>
      <li>
        Under Account permissions turn on &quot;{PLAY_BULK_REPORTS_PERMISSION}&quot; and
        save.
      </li>
      <li>Wait a while (Google can take some time to open the bucket), then press Try again.</li>
    </ol>
  );
}

function ProblemState({
  isRefreshing,
  onEditBucket,
  onRefresh,
  report,
}: {
  isRefreshing: boolean;
  onEditBucket: () => void;
  onRefresh: () => void;
  report: StorePerformanceReport;
}) {
  const retry = (
    <Button disabled={isRefreshing} onClick={onRefresh} size="sm" variant="outline">
      {isRefreshing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="mr-2 h-4 w-4" />
      )}
      Try again
    </Button>
  );

  if (report.status === "bucket_missing") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connect your Play reports</CardTitle>
          <CardDescription>
            Store performance reads the monthly reports Google Play writes to your
            developer account&apos;s Cloud Storage bucket. Add the bucket once per
            Google Play connection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>In {PLAY_REPORTS_BUCKET_HINT}.</li>
            <li>Paste it into Play reports bucket.</li>
            <li>
              Make sure the service account
              {report.serviceAccountEmail ? (
                <>
                  {" "}
                  <code className="break-all">{report.serviceAccountEmail}</code>
                </>
              ) : null}{" "}
              has the account permission &quot;{PLAY_BULK_REPORTS_PERMISSION}&quot;.
            </li>
          </ol>
          <Button onClick={onEditBucket} size="sm">
            Add Play reports bucket
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (report.status === "integration_required") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Needs a Google Play API connection</CardTitle>
          <CardDescription>{report.message}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild size="sm" variant="outline">
            <Link href="/settings">Open connected stores</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (report.status === "access_denied") {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>The service account cannot read the Play reports bucket</AlertTitle>
        <AlertDescription className="space-y-3">
          {/* The server message repeats the steps below; one short line is enough here. */}
          <p>
            Google Cloud Storage refused access to the bucket
            {report.bucket ? <> <code className="break-all">{report.bucket}</code></> : null}.
            The service account needs the bulk reports permission in Play Console.
          </p>
          <SetupSteps email={report.serviceAccountEmail} />
          <div className="flex flex-wrap gap-2">
            {retry}
            <Button onClick={onEditBucket} size="sm" variant="ghost">
              Change bucket
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  const title =
    report.status === "bucket_not_found"
      ? "Bucket not found"
      : report.status === "credentials_invalid"
        ? "Google did not accept the service account key"
        : "Could not read the Play reports";
  return (
    <Alert variant="destructive">
      <AlertTriangle />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="space-y-3">
        <p>{report.message}</p>
        <div className="flex flex-wrap gap-2">
          {retry}
          {report.status === "bucket_not_found" && (
            <Button onClick={onEditBucket} size="sm" variant="ghost">
              Change bucket
            </Button>
          )}
        </div>
      </AlertDescription>
    </Alert>
  );
}

function MonthBody({ data, tvOnly }: { data: StorePerformanceMonth; tvOnly: boolean }) {
  const traffic = data.traffic;
  if (!traffic) {
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          Google Play has not written a store performance report for{" "}
          {monthLabel(data.month)} yet. Play only writes a month once it has data,
          usually a few days in.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi label="Store listing visitors" value={formatCount(traffic.totals.visitors)} />
        <Kpi label="Acquisitions" value={formatCount(traffic.totals.acquisitions)} />
        <Kpi label="Conversion" value={formatConversion(traffic.totals.conversionRate)} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Traffic sources</CardTitle>
          <CardDescription>
            Where store listing visitors came from, as Google Play attributes them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FunnelTable
            firstColumn="Source"
            label="Traffic sources"
            rows={traffic.sources.map((row) => ({ ...row, key: row.source, label: row.source }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search terms</CardTitle>
          <CardDescription>
            Terms people searched on Google Play before opening the listing. Play only
            names a term once enough people used it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {traffic.searchTerms.length > 0 ? (
            <FunnelTable
              firstColumn="Search term"
              label="Search terms"
              rows={traffic.searchTerms.map((row) => ({ ...row, key: row.term, label: row.term }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {tvOnly
                ? "No search terms: Google Play does not report search terms for Android TV."
                : "Google Play reported no search terms for this month."}
            </p>
          )}
          {traffic.searchTermPlaceholders.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Not attributed to a term
              </p>
              <FunnelTable
                firstColumn="Play label"
                label="Traffic without a search term"
                rows={traffic.searchTermPlaceholders.map((row) => ({
                  ...row,
                  key: row.label,
                  label: row.label,
                }))}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {traffic.campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Campaigns (UTM)</CardTitle>
            <CardDescription>
              Visitors that arrived on a store link with utm_source / utm_campaign.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FunnelTable
              firstColumn="Source / campaign"
              label="Campaigns"
              rows={traffic.campaigns.map((row) => ({
                ...row,
                key: `${row.utmSource}/${row.utmCampaign}`,
                label: `${row.utmSource} / ${row.utmCampaign}`,
              }))}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Countries</CardTitle>
          <CardDescription>
            Play groups small countries under Other.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data.countries && data.countries.length > 0 ? (
            <FunnelTable
              firstColumn="Country"
              label="Countries"
              rows={data.countries.map((row) => ({
                ...row,
                key: row.country,
                label: countryName(row.country),
              }))}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Google Play wrote no country report for this month.
            </p>
          )}
        </CardContent>
      </Card>

      {data.installs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Installs</CardTitle>
            <CardDescription>
              From the Play installs overview{data.installs.lastDay ? `, through ${data.installs.lastDay}` : ""}.
              It counts every install, not only those from the store listing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-3 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-muted-foreground">User installs</dt>
                <dd className="font-medium tabular-nums">{formatCount(data.installs.userInstalls)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Device installs</dt>
                <dd className="font-medium tabular-nums">{formatCount(data.installs.deviceInstalls)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Device uninstalls</dt>
                <dd className="font-medium tabular-nums">{formatCount(data.installs.deviceUninstalls)}</dd>
              </div>
              {data.installs.activeDevices !== null && (
                <div>
                  <dt className="text-muted-foreground">Active devices (last day)</dt>
                  <dd className="font-medium tabular-nums">{formatCount(data.installs.activeDevices)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Google Play store listing performance: one month at a time, from the Play
 * Console bulk reports. Every problem (bucket not set, permission missing) is
 * a state with its fix, never an empty table.
 */
export function StorePerformanceView({
  error,
  isLoading,
  isRefreshing,
  month,
  onEditBucket,
  onMonthChange,
  onRefresh,
  report,
}: StorePerformanceViewProps) {
  if (isLoading) {
    return (
      <div aria-busy="true" aria-label="Loading store performance" className="space-y-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <Alert variant="destructive">
        <AlertTriangle />
        <AlertTitle>Could not load store performance</AlertTitle>
        <AlertDescription className="space-y-2">
          <p>{error?.message ?? "No answer from the server."}</p>
          <Button onClick={onRefresh} size="sm" variant="outline">
            Try again
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!report.supported) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">App Store analytics coming later</CardTitle>
            <Badge variant="secondary">Coming later</Badge>
          </div>
          <CardDescription>{report.message}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (report.status !== "ok") {
    return (
      <ProblemState
        isRefreshing={isRefreshing}
        onEditBucket={onEditBucket}
        onRefresh={onRefresh}
        report={report}
      />
    );
  }

  const selected = report.months.find((m) => m.month === month) ?? report.months[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Select onValueChange={onMonthChange} value={selected?.month}>
          <SelectTrigger aria-label="Month" className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {report.months.map((m) => (
              <SelectItem key={m.month} value={m.month}>
                {monthLabel(m.month)}
                {m.traffic ? "" : " (no data)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {selected?.lastDay ? `Data through ${selected.lastDay}. ` : ""}
          Google Play updates these reports about once a day.
        </p>
        <Button
          aria-label="Read the Play reports again"
          className="ml-auto"
          disabled={isRefreshing}
          onClick={onRefresh}
          size="sm"
          variant="outline"
        >
          {isRefreshing ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </div>

      {report.tvOnly && (
        <Alert>
          <Tv />
          <AlertTitle>Android TV traffic is all &quot;Other&quot;</AlertTitle>
          <AlertDescription>
            Google Play reports every store visit on TV under the Other source and
            with no search terms, so this page cannot tell search from referrals for a
            TV package. Visitors, acquisitions and conversion are still exact.
          </AlertDescription>
        </Alert>
      )}

      {selected ? (
        <MonthBody data={selected} tvOnly={report.tvOnly} />
      ) : (
        <Alert>
          <Info />
          <AlertTitle>No months to show</AlertTitle>
        </Alert>
      )}
    </div>
  );
}
