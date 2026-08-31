"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { api } from "@/lib/api";

export function useAppleAdsStatus() {
	return useQuery({
		queryFn: () => api.appleAds.status(),
		queryKey: ["apple-ads", "status"],
	});
}

export function useAppleAdsConnect() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (body: {
			clientId: string;
			keyId: string;
			privateKey: string;
			teamId: string;
		}) => api.appleAds.connect(body),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Apple Ads connection failed",
			);
		},
		onSuccess: () => {
			toast.success("Apple Ads connected");
			queryClient.invalidateQueries({ queryKey: ["apple-ads"] });
		},
	});
}

export function useAppleAdsDisconnect() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => api.appleAds.disconnect(),
		onSuccess: () => {
			toast.success("Apple Ads disconnected");
			queryClient.invalidateQueries({ queryKey: ["apple-ads"] });
		},
	});
}

export function useAppleAdsSetSource() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (source: "internal" | "apple") =>
			api.appleAds.setSource(source),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Failed to switch source",
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["apple-ads"] });
		},
	});
}

export function useAppleAdsSync() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (country: string) => api.appleAds.sync(country),
		onError: (err) => {
			toast.error(err instanceof Error ? err.message : "Apple sync failed");
		},
		onSuccess: (result) => {
			toast.success(
				result.alreadySynced
					? `Week ${result.week} is already synced for ${result.country.toUpperCase()}`
					: `Synced ${result.terms} terms for ${result.country.toUpperCase()} (week ${result.week})`,
			);
			queryClient.invalidateQueries({ queryKey: ["apple-ads"] });
		},
	});
}

export function useAppleMovers(country: string, enabled: boolean) {
	return useQuery({
		enabled,
		queryFn: () => api.appleAds.movers(country),
		queryKey: ["apple-ads", "movers", country],
	});
}

export function useAppleTrend(
	country: string | null,
	term: string | null,
	enabled = true,
) {
	return useQuery({
		enabled: enabled && country !== null && term !== null,
		queryFn: () => api.appleAds.trend(country as string, term as string),
		queryKey: ["apple-ads", "trend", country, term],
	});
}

export function useAppleImpressions(appId: string | null) {
	return useQuery({
		enabled: appId !== null,
		queryFn: () => api.appleAds.impressions(appId as string),
		queryKey: ["apple-ads", "impressions", appId],
	});
}

export function useSyncAppleImpressions() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (appId: string) => api.appleAds.syncImpressions(appId),
		onError: (err) => {
			toast.error(
				err instanceof Error ? err.message : "Impression sync failed",
			);
		},
		onSuccess: (result) => {
			toast.success(`Stored ${result.stored} impression-share rows`);
			queryClient.invalidateQueries({
				queryKey: ["apple-ads", "impressions"],
			});
		},
	});
}
