import type { RatingsSummary, Review } from "@/lib/types";

/** Buzzin-like group summary used by the ratings tests. */
export const GROUP_SUMMARY: RatingsSummary = {
  apps: [
    {
      appId: "ios-1",
      devices: ["phone"],
      externalId: "6787068440",
      lastRefreshedAt: "2026-11-04T03:20:00.000Z",
      name: "Buzzin",
      platform: "ios",
      storeType: "app_store",
    },
    {
      appId: "android-1",
      devices: ["phone"],
      externalId: "tech.ravenlab.buzzin",
      lastRefreshedAt: "2026-11-04T03:10:00.000Z",
      name: "Buzzin",
      platform: "android",
      storeType: "google_play",
    },
  ],
  fetchedAt: "2026-11-04T03:20:00.000Z",
  group: { id: "g1", name: "Buzzin" },
  refreshing: false,
  scope: "group",
  stores: [
    {
      average: 4.656,
      countries: [
        {
          average: 4.593,
          country: "pl",
          fetchedAt: "2026-11-04T03:20:00.000Z",
          histogram: null,
          ratingCount: 27,
          writtenReviews: 4,
        },
        {
          average: 5,
          country: "us",
          fetchedAt: "2026-11-04T03:20:00.000Z",
          histogram: null,
          ratingCount: 5,
          writtenReviews: 2,
        },
      ],
      fetchedAt: "2026-11-04T03:20:00.000Z",
      histogram: null,
      ratingCount: 32,
      storeType: "app_store",
      syncedReviews: 6,
      writtenReviews: 6,
    },
    {
      average: 4.529,
      countries: [
        {
          average: 4.529,
          country: "pl",
          fetchedAt: "2026-11-04T03:10:00.000Z",
          histogram: { "1": 5, "2": 3, "3": 0, "4": 3, "5": 62 },
          ratingCount: 73,
          writtenReviews: 21,
        },
      ],
      fetchedAt: "2026-11-04T03:10:00.000Z",
      histogram: { "1": 5, "2": 3, "3": 0, "4": 3, "5": 62 },
      ratingCount: 73,
      storeType: "google_play",
      syncedReviews: 3,
      writtenReviews: 21,
    },
  ],
  total: { average: 4.558, ratingCount: 105, writtenReviews: 27 },
};

export const GROUP_REVIEWS: Review[] = [
  {
    appId: "ios-1",
    appName: "Buzzin iPhone",
    authorName: "Ania",
    body: "Best party game on the TV",
    canReply: true,
    country: "pl",
    externalId: "asc-1",
    id: "r-asc-1",
    rating: 5,
    reviewDate: "2026-11-01T17:00:00.000Z",
    storeType: "app_store",
    territory: "pl",
    title: "Super",
  },
  {
    appId: "android-1",
    appName: "Buzzin Android",
    authorName: "Kuba",
    body: "Fun with friends",
    canReply: true,
    country: null,
    externalId: "gp-1",
    id: "r-gp-1",
    rating: 4,
    reviewDate: "2026-11-02T17:00:00.000Z",
    storeType: "google_play",
  },
];
