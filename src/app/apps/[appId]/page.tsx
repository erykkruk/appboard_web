"use client";

import { useParams, redirect } from "next/navigation";

export default function AppOverview() {
  const params = useParams<{ appId: string }>();
  redirect(`/apps/${params.appId}/dashboard`);
}
