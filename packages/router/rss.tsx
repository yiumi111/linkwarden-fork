import { RssSubscription } from "@linkwarden/prisma/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export interface RssSubscriptionWithCollectionName extends RssSubscription {
  collection: {
    name: string;
  };
}

export type RssSubscriptionPayload = {
  name: string;
  url: string;
  collectionId?: number;
  collectionName?: string;
};

const useRssSubscriptions = () => {
  const { status } = useSession();

  return useQuery({
    queryKey: ["rss-subscriptions"],
    queryFn: async () => {
      const response = await fetch("/api/v1/rss");
      if (!response.ok) throw new Error("Failed to fetch rss subscriptions.");

      const data = await response.json();
      return data.response as RssSubscriptionWithCollectionName[];
    },
    enabled: status === "authenticated",
  });
};

const useAddRssSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: RssSubscriptionPayload) => {
      const response = await fetch("/api/v1/rss", {
        body: JSON.stringify(body),
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rss-subscriptions"] });
    },
  });
};

const useUpdateRssSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      rssSubscriptionId,
      body,
    }: {
      rssSubscriptionId: number;
      body: RssSubscriptionPayload;
    }) => {
      const response = await fetch(`/api/v1/rss/${rssSubscriptionId}`, {
        body: JSON.stringify(body),
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.response);

      return data.response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rss-subscriptions"] });
    },
  });
};

const useDeleteRssSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (rssSubscriptionId: number) => {
      const response = await fetch(`/api/v1/rss/${rssSubscriptionId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.response);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rss-subscriptions"] });
    },
  });
};

export {
  useRssSubscriptions,
  useAddRssSubscription,
  useUpdateRssSubscription,
  useDeleteRssSubscription,
};
