import {
  LinkIncludingShortenedCollectionAndTags,
  ArchivedFormat,
} from "@linkwarden/types/global";

export type BadgeType = "collection" | "tag" | "preserved_format";

export interface Badge {
  type: BadgeType;
  value: string;
  format?: ArchivedFormat;
}

export function getLinkDisplayTitle(
  link: Partial<LinkIncludingShortenedCollectionAndTags>
): string {
  if (link.name?.trim()) {
    return link.name.trim();
  }

  if (link.url) {
    const hostname = extractHostname(link.url);
    if (hostname) {
      return hostname;
    }
    return link.url;
  }

  return "";
}

export function getLinkDisplaySubtitle(
  link: Partial<LinkIncludingShortenedCollectionAndTags>
): string {
  const hostname = link.url ? extractHostname(link.url) : null;
  if (hostname) {
    return hostname;
  }

  if (link.description?.trim()) {
    const trimmed = link.description.trim();
    return trimmed.length > 100 ? trimmed.slice(0, 97) + "..." : trimmed;
  }

  return "";
}

export function getLinkDisplayBadges(
  link: Partial<LinkIncludingShortenedCollectionAndTags>
): Badge[] {
  const badges: Badge[] = [];

  if (link.collection?.name?.trim()) {
    badges.push({
      type: "collection",
      value: link.collection.name.trim(),
    });
  }

  if (link.tags && Array.isArray(link.tags)) {
    for (const tag of link.tags) {
      if (tag.name?.trim()) {
        badges.push({
          type: "tag",
          value: tag.name.trim(),
        });
      }
    }
  }

  if (link.pdf && link.pdf !== "unavailable") {
    badges.push({
      type: "preserved_format",
      value: "PDF",
      format: ArchivedFormat.pdf,
    });
  }
  if (link.readable && link.readable !== "unavailable") {
    badges.push({
      type: "preserved_format",
      value: "Readable",
      format: ArchivedFormat.readability,
    });
  }
  if (link.monolith && link.monolith !== "unavailable") {
    badges.push({
      type: "preserved_format",
      value: "Webpage",
      format: ArchivedFormat.monolith,
    });
  }
  if (link.image && link.image !== "unavailable") {
    badges.push({
      type: "preserved_format",
      value: "Screenshot",
      format: link.image.endsWith("png")
        ? ArchivedFormat.png
        : ArchivedFormat.jpeg,
    });
  }

  return badges;
}

export function getLinkExternalOpenUrl(
  link: Partial<LinkIncludingShortenedCollectionAndTags>
): string {
  if (!link.url) {
    return "";
  }

  const url = link.url.trim();
  if (!url) {
    return "";
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(url)) {
    return "https://" + url;
  }

  return "";
}

function extractHostname(url: string): string | null {
  try {
    let urlToParse = url;
    if (!/^https?:\/\//i.test(urlToParse)) {
      urlToParse = "https://" + urlToParse;
    }
    const parsed = new URL(urlToParse);
    return parsed.hostname;
  } catch {
    return null;
  }
}
