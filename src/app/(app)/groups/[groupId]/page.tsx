"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

export default function GroupPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();

  useEffect(() => {
    router.replace(`/groups/${params.groupId}/information`);
  }, [params.groupId, router]);

  return null;
}
