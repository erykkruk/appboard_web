"use client";

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";

export function useOverview() {
  return useQuery({
    queryKey: ["overview"],
    queryFn: () => api.overview.get(),
  });
}
