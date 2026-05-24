import { describe, expect, it } from "vitest";
import { ArchivedFormat } from "@linkwarden/types/global";
import {
  getLinkDisplayBadges,
  getLinkDisplaySubtitle,
  getLinkDisplayTitle,
  getLinkExternalOpenUrl,
  type LinkDisplayMetaInput,
} from "./linkDisplayMeta";

const buildLink = (
  overrides: Partial<LinkDisplayMetaInput> = {}
): LinkDisplayMetaInput => ({
  name: "",
  url: "",
  description: "",
  collection: {
    name: "",
    ownerId: 1,
  },
  tags: [],
  ...overrides,
});

describe("linkDisplayMeta", () => {
  it("uses the trimmed link name as the display title", () => {
    const link = buildLink({
      name: "  Deep dive article  ",
      url: "https://example.com/post",
    });

    expect(getLinkDisplayTitle(link)).toBe("Deep dive article");
  });

  it("falls back to the URL hostname when the link has no title", () => {
    const link = buildLink({
      name: "   ",
      url: "https://sub.example.com/article",
    });

    expect(getLinkDisplayTitle(link)).toBe("sub.example.com");
    expect(getLinkDisplaySubtitle(link)).toBe("sub.example.com");
  });

  it("falls back to the raw URL when the URL is invalid", () => {
    const link = buildLink({
      url: "not a valid url",
    });

    expect(getLinkDisplayTitle(link)).toBe("not a valid url");
    expect(getLinkExternalOpenUrl(link)).toBe("");
  });

  it("adds https to domain-like URLs without a protocol", () => {
    const link = buildLink({
      url: "example.com/docs/getting-started",
    });

    expect(getLinkExternalOpenUrl(link)).toBe(
      "https://example.com/docs/getting-started"
    );
  });

  it("uses the description as the subtitle fallback", () => {
    const link = buildLink({
      description: "  A   short\nsummary of the saved page.  ",
    });

    expect(getLinkDisplaySubtitle(link)).toBe(
      "A short summary of the saved page."
    );
  });

  it("builds badges for collection, multiple tags, and preserved formats", () => {
    const link = buildLink({
      collection: {
        name: "Reading List",
        ownerId: 1,
      },
      tags: [{ name: "frontend" }, { name: "react" }] as never,
      pdf: "archives/42.pdf",
      readable: "archives/42.html",
      monolith: "archives/42.mhtml",
      image: "archives/42.png",
    });

    expect(getLinkDisplayBadges(link)).toEqual([
      { kind: "collection", value: "Reading List", label: "Reading List" },
      { kind: "tag", value: "frontend", label: "frontend" },
      { kind: "tag", value: "react", label: "react" },
      { kind: "format", value: "webpage", label: "Webpage" },
      { kind: "format", value: "screenshot", label: "Screenshot" },
      { kind: "format", value: "pdf", label: "PDF" },
      { kind: "format", value: "readable", label: "Readable" },
    ]);
  });

  it("supports preservedFormats arrays when building badges", () => {
    const link = buildLink({
      preservedFormats: [
        ArchivedFormat.pdf,
        ArchivedFormat.readability,
        "monolith",
        "png",
      ],
    });

    expect(
      getLinkDisplayBadges(link)
        .filter((badge) => badge.kind === "format")
        .map((badge) => badge.label)
    ).toEqual(["Webpage", "Screenshot", "PDF", "Readable"]);
  });

  it("returns empty values when link fields are empty", () => {
    const link = buildLink({
      collection: {
        name: "",
        ownerId: 1,
      },
      tags: [],
    });

    expect(getLinkDisplayTitle(link)).toBe("");
    expect(getLinkDisplaySubtitle(link)).toBe("");
    expect(getLinkExternalOpenUrl(link)).toBe("");
    expect(getLinkDisplayBadges(link)).toEqual([]);
  });
});
