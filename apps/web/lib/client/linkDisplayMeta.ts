type LinkLike = {
  name?: string | null;
  url?: string | null;
  type?: string | null;
  description?: string | null;
  collection?: { name?: string | null } | null;
  tags?: { name?: string | null }[] | null;
  image?: string | null;
  pdf?: string | null;
  readable?: string | null;
  monolith?: string | null;
};

export type LinkDisplayBadge = {
  type: "collection" | "tag" | "format";
  label: string;
};

function isPreservedFormatAvailable(
  link: LinkLike,
  format: "image" | "pdf" | "readable" | "monolith"
): boolean {
  const value = link[format];
  return Boolean(value && value !== "unavailable");
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function looksLikeDomain(str: string): boolean {
  // 宽松判定：至少包含一个点号，且不是 http/https/ftp 等协议开头
  if (/^(https?|ftp|file|data|javascript|mailto):/i.test(str)) {
    return false;
  }
  return /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?)+/.test(
    str
  );
}

export function getLinkDisplayTitle(link?: LinkLike | null): string {
  if (!link) return "";

  const name = typeof link.name === "string" ? link.name.trim() : "";
  if (name) return name;

  if (link.url) {
    const hostname = getHostname(link.url);
    if (hostname) return hostname;
    return link.url;
  }

  return "";
}

export function getLinkDisplaySubtitle(link?: LinkLike | null): string {
  if (!link) return "";

  if (link.url) {
    const hostname = getHostname(link.url);
    if (hostname) return hostname;
  }

  if (link.description) {
    const trimmed = link.description.trim();
    if (trimmed) return trimmed.length > 120 ? trimmed.slice(0, 120) + "\u2026" : trimmed;
  }

  return "";
}

const FORMAT_LABELS: Record<string, string> = {
  pdf: "PDF",
  readable: "Readable",
  monolith: "Webpage",
  image: "Screenshot",
};

export function getLinkDisplayBadges(link?: LinkLike | null): LinkDisplayBadge[] {
  const badges: LinkDisplayBadge[] = [];
  if (!link) return badges;

  if (link.collection?.name) {
    badges.push({ type: "collection", label: link.collection.name });
  }

  if (link.tags) {
    for (const tag of link.tags) {
      if (tag?.name) {
        badges.push({ type: "tag", label: tag.name });
      }
    }
  }

  const formats = ["pdf", "readable", "monolith", "image"] as const;
  for (const fmt of formats) {
    if (isPreservedFormatAvailable(link, fmt)) {
      badges.push({
        type: "format",
        label: FORMAT_LABELS[fmt],
      });
    }
  }

  return badges;
}

export function getLinkExternalOpenUrl(link?: LinkLike | null): string {
  if (!link?.url) return "";

  const url = link.url.trim();
  if (!url) return "";

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  if (looksLikeDomain(url)) {
    return `https://${url}`;
  }

  return "";
}