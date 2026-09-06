"use client";

import Link from "next/link";

import { AddAppForm } from "@/components/add-app-dialog";
import { FlowSteps } from "@/components/flow-steps";
import { NewAppForm } from "@/components/new-app-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Step 1 of the flow: one field. Paste a store link (or type a name) and the
 * app is imported from public data - store API credentials are an optional
 * add-on for publishing, never a precondition for using AppBoard.
 */
export default function StartPage() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-16">
      <FlowSteps current="add" />
      <h1 className="font-bold text-2xl tracking-tight">Add your app</h1>
      <p className="mt-2 text-muted-foreground text-sm">
        No store credentials needed. We read what is public: your listing,
        screenshots and reviews. Connect the store API later, only if you want
        to publish from here.
      </p>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">It is already in a store</CardTitle>
        </CardHeader>
        <CardContent>
          <AddAppForm
            autoFocus
            destination={(appId) => `/apps/${appId}/start`}
          />
        </CardContent>
      </Card>

      <div className="my-6 flex items-center gap-3 text-muted-foreground text-xs">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            It is not published yet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <NewAppForm />
        </CardContent>
      </Card>

      <p className="mt-4 text-muted-foreground text-xs">
        Already added something?{" "}
        <Link href="/dashboard" className="underline underline-offset-2">
          Go to your apps
        </Link>
        .
      </p>
    </div>
  );
}
