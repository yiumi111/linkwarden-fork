import {
  ArchivedFormat,
  LinkIncludingShortenedCollectionAndTags,
} from "@linkwarden/types/global";
import { formatAvailable } from "@linkwarden/lib/formatStats";

export type LinkBadge =
  | { type: "collection"; label: string }
  | { type: "tag"; label: string }
  | { type: "format"; label: string; format: "pdf" | "readable" | "webpage" | "screenshot" };

export function getLinkDisplayTitle(link: LinkIncludingShortenedCollectionAndTags): string {
  if (link.name && link.name.trim()) {
    return link.name.trim();
  }
  if (link.url) {
    try {
      const url = new URL(link.url);
      return url.hostname;
    } catch {
      return link.url;
    }
  }
  return "";
}

export function getLinkDisplaySubtitle(link: LinkIncludingShortenedCollectionAndTags): string {
  if (link.url) {
    try {
      const url = new URL(link.url);
      return url.hostname;
    } catch {
      // continue to description
    }
  }
  if (link.description && link.description.trim()) {
    return link.description.trim();
  }
  return "";
}

export function getLinkDisplayBadges(link: LinkIncludingShortenedCollectionAndTags): LinkBadge[] {
  const badges: LinkBadge[] = [];

  if (link.collection?.name) {
    badges.push({ type: "collection", label: link.collection.name });
  }

  if (link.tags && link.tags.length > 0) {
    for (const tag of link.tags) {
      if (tag.name) {
        badges.push({ type: "tag", label: tag.name });
      }
    }
  }

  if (formatAvailable(link, "pdf")) {
    badges.push({ type: "format", label: "PDF", format: "pdf" });
  }
  if (formatAvailable(link, "readable")) {
    badges.push({ type: "format", label: "Readable", format: "readable" });
  }
  if (formatAvailable(link, "monolith")) {
    badges.push({ type: "format", label: "Webpage", format: "webpage" });
  }
  if (formatAvailable(link, "image")) {
    badges.push({ type: "format", label: "Screenshot", format: "screenshot" });
  }

  return badges;
}

export function getLinkExternalOpenUrl(url: string | null | undefined): string {
  if (!url) {
    return "";
  }

  const trimmed = url.trim();
  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  const domainPattern = /^[a-zA-Z0-9][a-zA-Z0-9\-]*(\.[a-zA-Z0-9][a-zA-Z0-9\-]*)+/;
  if (domainPattern.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return "";
}