import { LinkIncludingShortenedCollectionAndTags, ArchivedFormat } from "@linkwarden/types/global";

export type LinkDisplayBadge = {
  type: 'collection' | 'tag' | 'format';
  label: string;
  format?: ArchivedFormat;
};

export function getLinkDisplayTitle(link: Partial<LinkIncludingShortenedCollectionAndTags>): string {
  if (link.name && link.name.trim() !== '') {
    return link.name.trim();
  }
  
  if (link.url) {
    try {
      const urlObj = new URL(link.url.startsWith('http') ? link.url : `https://${link.url}`);
      if (urlObj.hostname) {
        return urlObj.hostname;
      }
    } catch (e) {
      // Ignore invalid URL parsing
    }
    return link.url;
  }
  
  return '';
}

export function getLinkDisplaySubtitle(link: Partial<LinkIncludingShortenedCollectionAndTags>): string {
  if (link.url) {
    try {
      const urlObj = new URL(link.url.startsWith('http') ? link.url : `https://${link.url}`);
      if (urlObj.hostname) {
        return urlObj.hostname;
      }
    } catch (e) {
      // Ignore invalid URL parsing
    }
  }
  
  if (link.description && link.description.trim() !== '') {
    return link.description.trim();
  }
  
  return '';
}

export function getLinkDisplayBadges(link: Partial<LinkIncludingShortenedCollectionAndTags>): LinkDisplayBadge[] {
  const badges: LinkDisplayBadge[] = [];

  if (link.collection && link.collection.name) {
    badges.push({
      type: 'collection',
      label: link.collection.name
    });
  }

  if (link.tags && Array.isArray(link.tags)) {
    link.tags.forEach((tag: any) => {
      if (tag.name) {
        badges.push({
          type: 'tag',
          label: tag.name
        });
      }
    });
  }

  const isAvailable = (format: string | null | undefined) => format && format !== 'unavailable';

  if (isAvailable(link.monolith)) {
    badges.push({
      type: 'format',
      label: 'Webpage',
      format: ArchivedFormat.monolith
    });
  }
  
  if (isAvailable(link.image)) {
    badges.push({
      type: 'format',
      label: 'Screenshot',
      format: link.image?.endsWith('png') ? ArchivedFormat.png : ArchivedFormat.jpeg
    });
  }
  
  if (isAvailable(link.pdf)) {
    badges.push({
      type: 'format',
      label: 'PDF',
      format: ArchivedFormat.pdf
    });
  }
  
  if (isAvailable(link.readable)) {
    badges.push({
      type: 'format',
      label: 'Readable',
      format: ArchivedFormat.readability
    });
  }

  return badges;
}

export function getLinkExternalOpenUrl(url?: string | null): string {
  if (!url || url.trim() === '') {
    return '';
  }
  
  const trimmedUrl = url.trim();
  
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }
  
  try {
    const urlObj = new URL(`https://${trimmedUrl}`);
    return urlObj.href;
  } catch (e) {
    return '';
  }
}
