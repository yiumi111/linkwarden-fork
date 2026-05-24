import {
  ArchivedFormat,
  LinkIncludingShortenedCollectionAndTags,
} from "@linkwarden/types/global";

type MaybeString = string | null | undefined;

export type LinkDisplayFormatKey =
  | "pdf"
  | "readable"
  | "webpage"
  | "screenshot";

export type LinkDisplayBadge =
  | {
      kind: "collection" | "tag";
      value: string;
      label: string;
    }
  | {
      kind: "format";
      value: LinkDisplayFormatKey;
      label: string;
    };

export type LinkDisplayMetaInput = Partial<
  Pick<
    LinkIncludingShortenedCollectionAndTags,
    | "name"
    | "url"
    | "description"
    | "collection"
    | "tags"
    | "pdf"
    | "readable"
    | "monolith"
    | "image"
  >
> & {
  preservedFormats?: Array<ArchivedFormat | string | null | undefined> | null;
};

const DOMAIN_LIKE_PATTERN =
  /^(?:\/\/)?(?:localhost|(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63})(?::\d{2,5})?(?:[/?#].*)?$/i;

const FORMAT_LABELS: Record<LinkDisplayFormatKey, string> = {
  pdf: "PDF",
  readable: "Readable",
  webpage: "Webpage",
  screenshot: "Screenshot",
};

const FORMAT_ORDER: LinkDisplayFormatKey[] = [
  "webpage",
  "screenshot",
  "pdf",
  "readable",
];

const normalizeText = (value: MaybeString) => value?.trim() ?? "";

const collapseWhitespace = (value: MaybeString) =>
  normalizeText(value).replace(/\s+/g, " ");

const getRawUrl = (input?: LinkDisplayMetaInput | MaybeString) =>
  typeof input === "string" ? normalizeText(input) : normalizeText(input?.url);

const tryParseHttpUrl = (value: string) => {
  try {
    const parsedUrl = new URL(value);

    if (
      parsedUrl.protocol !== "http:" &&
      parsedUrl.protocol !== "https:"
    ) {
      return null;
    }

    return parsedUrl;
  } catch {
    return null;
  }
};

const getHostnameFromUrl = (input?: LinkDisplayMetaInput | MaybeString) => {
  const externalOpenUrl = getLinkExternalOpenUrl(input);

  if (!externalOpenUrl) {
    return "";
  }

  return tryParseHttpUrl(externalOpenUrl)?.hostname ?? "";
};

const hasPreservedAsset = (value: MaybeString) => {
  const normalizedValue = normalizeText(value);
  return normalizedValue !== "" && normalizedValue !== "unavailable";
};

const normalizePreservedFormat = (
  value: ArchivedFormat | string | null | undefined
): LinkDisplayFormatKey | null => {
  if (value === ArchivedFormat.pdf) {
    return "pdf";
  }

  if (value === ArchivedFormat.readability) {
    return "readable";
  }

  if (value === ArchivedFormat.monolith) {
    return "webpage";
  }

  if (value === ArchivedFormat.png || value === ArchivedFormat.jpeg) {
    return "screenshot";
  }

  const normalizedValue = normalizeText(
    typeof value === "string" ? value.toLowerCase() : ""
  );

  if (normalizedValue === "pdf") {
    return "pdf";
  }

  if (normalizedValue === "readable" || normalizedValue === "readability") {
    return "readable";
  }

  if (normalizedValue === "webpage" || normalizedValue === "monolith") {
    return "webpage";
  }

  if (
    normalizedValue === "screenshot" ||
    normalizedValue === "image" ||
    normalizedValue === "png" ||
    normalizedValue === "jpeg" ||
    normalizedValue === "jpg"
  ) {
    return "screenshot";
  }

  return null;
};

export const getLinkDisplayTitle = (link?: LinkDisplayMetaInput) => {
  const displayName = normalizeText(link?.name);

  if (displayName) {
    return displayName;
  }

  const hostname = getHostnameFromUrl(link);

  if (hostname) {
    return hostname;
  }

  return getRawUrl(link);
};

export const getLinkDisplaySubtitle = (link?: LinkDisplayMetaInput) => {
  const hostname = getHostnameFromUrl(link);

  if (hostname) {
    return hostname;
  }

  const description = collapseWhitespace(link?.description);

  if (!description) {
    return "";
  }

  return description.length > 140
    ? `${description.slice(0, 139).trimEnd()}…`
    : description;
};

export const getLinkDisplayBadges = (
  link?: LinkDisplayMetaInput
): LinkDisplayBadge[] => {
  const badges: LinkDisplayBadge[] = [];
  const addedBadges = new Set<string>();

  const appendBadge = (badge: LinkDisplayBadge) => {
    if (!badge.label) {
      return;
    }

    const dedupeKey = `${badge.kind}:${badge.value}`;

    if (addedBadges.has(dedupeKey)) {
      return;
    }

    addedBadges.add(dedupeKey);
    badges.push(badge);
  };

  const collectionName = normalizeText(link?.collection?.name);

  if (collectionName) {
    appendBadge({
      kind: "collection",
      value: collectionName,
      label: collectionName,
    });
  }

  link?.tags?.forEach((tag) => {
    const tagName = normalizeText(tag?.name);

    if (!tagName) {
      return;
    }

    appendBadge({
      kind: "tag",
      value: tagName,
      label: tagName,
    });
  });

  const availableFormats = new Set<LinkDisplayFormatKey>();

  link?.preservedFormats?.forEach((format) => {
    const normalizedFormat = normalizePreservedFormat(format);

    if (normalizedFormat) {
      availableFormats.add(normalizedFormat);
    }
  });

  if (hasPreservedAsset(link?.monolith)) {
    availableFormats.add("webpage");
  }

  if (hasPreservedAsset(link?.image)) {
    availableFormats.add("screenshot");
  }

  if (hasPreservedAsset(link?.pdf)) {
    availableFormats.add("pdf");
  }

  if (hasPreservedAsset(link?.readable)) {
    availableFormats.add("readable");
  }

  FORMAT_ORDER.forEach((format) => {
    if (!availableFormats.has(format)) {
      return;
    }

    appendBadge({
      kind: "format",
      value: format,
      label: FORMAT_LABELS[format],
    });
  });

  return badges;
};

export const getLinkExternalOpenUrl = (
  input?: LinkDisplayMetaInput | MaybeString
) => {
  const rawUrl = getRawUrl(input);

  if (!rawUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(rawUrl)) {
    return tryParseHttpUrl(rawUrl) ? rawUrl : "";
  }

  const protocolRelativeUrl = rawUrl.startsWith("//")
    ? `https:${rawUrl}`
    : rawUrl;

  if (!DOMAIN_LIKE_PATTERN.test(protocolRelativeUrl)) {
    return "";
  }

  const normalizedUrl = protocolRelativeUrl.startsWith("https://")
    ? protocolRelativeUrl
    : `https://${protocolRelativeUrl.replace(/^\/\//, "")}`;

  return tryParseHttpUrl(normalizedUrl) ? normalizedUrl : "";
};
