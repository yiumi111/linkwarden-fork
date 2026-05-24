import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getLinkDisplayTitle,
  getLinkDisplaySubtitle,
  getLinkDisplayBadges,
  getLinkExternalOpenUrl,
} from "./linkDisplayMeta";
import { ArchivedFormat } from "@linkwarden/types/global";

const createMockLink = (overrides: Partial<any> = {}) => ({
  id: 1,
  name: "",
  url: "",
  description: "",
  collection: { id: 1, name: "" },
  tags: [],
  pdf: undefined,
  readable: undefined,
  monolith: undefined,
  image: undefined,
  preview: undefined,
  type: "url" as const,
  ...overrides,
});

describe("getLinkDisplayTitle", () => {
  it("returns trimmed name when name exists", () => {
    const link = createMockLink({ name: "  My Link Title  " });
    expect(getLinkDisplayTitle(link)).toBe("My Link Title");
  });

  it("returns hostname when name is empty but url exists", () => {
    const link = createMockLink({ name: "", url: "https://example.com/path" });
    expect(getLinkDisplayTitle(link)).toBe("example.com");
  });

  it("returns hostname when name is whitespace only", () => {
    const link = createMockLink({ name: "   ", url: "https://test.org" });
    expect(getLinkDisplayTitle(link)).toBe("test.org");
  });

  it("returns original url when name is empty and url has no valid hostname", () => {
    const link = createMockLink({ name: "", url: "not-a-valid-url" });
    expect(getLinkDisplayTitle(link)).toBe("not-a-valid-url");
  });

  it("returns empty string when link is empty", () => {
    const link = createMockLink({ name: "", url: "" });
    expect(getLinkDisplayTitle(link)).toBe("");
  });

  it("prefers name over url hostname", () => {
    const link = createMockLink({ name: "Custom Title", url: "https://example.com" });
    expect(getLinkDisplayTitle(link)).toBe("Custom Title");
  });
});

describe("getLinkDisplaySubtitle", () => {
  it("returns hostname from url", () => {
    const link = createMockLink({ url: "https://docs.example.com/guide" });
    expect(getLinkDisplaySubtitle(link)).toBe("docs.example.com");
  });

  it("falls back to description when no url", () => {
    const link = createMockLink({ url: "", description: "A useful link description" });
    expect(getLinkDisplaySubtitle(link)).toBe("A useful link description");
  });

  it("falls back to trimmed description when url is invalid", () => {
    const link = createMockLink({ url: "invalid", description: "  Fallback text  " });
    expect(getLinkDisplaySubtitle(link)).toBe("Fallback text");
  });

  it("returns empty string when both url and description are empty", () => {
    const link = createMockLink({ url: "", description: "" });
    expect(getLinkDisplaySubtitle(link)).toBe("");
  });

  it("returns hostname before description", () => {
    const link = createMockLink({
      url: "https://api.test.io/v1",
      description: "Some description",
    });
    expect(getLinkDisplaySubtitle(link)).toBe("api.test.io");
  });
});

describe("getLinkDisplayBadges", () => {
  beforeEach(() => {
    vi.mock("@linkwarden/lib/formatStats", () => ({
      formatAvailable: vi.fn(),
    }));
  });

  it("returns collection badge", () => {
    const link = createMockLink({ collection: { id: 1, name: "Work" } });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toContainEqual({ type: "collection", label: "Work" });
  });

  it("returns multiple tag badges", () => {
    const link = createMockLink({
      tags: [{ id: 1, name: "important" }, { id: 2, name: "urgent" }],
    });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toContainEqual({ type: "tag", label: "important" });
    expect(badges).toContainEqual({ type: "tag", label: "urgent" });
  });

  it("returns PDF format badge when available", () => {
    const link = createMockLink({ pdf: "available" });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toContainEqual({ type: "format", label: "PDF", format: "pdf" });
  });

  it("returns Readable format badge when available", () => {
    const link = createMockLink({ readable: "available" });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toContainEqual({ type: "format", label: "Readable", format: "readable" });
  });

  it("returns Webpage format badge when monolith is available", () => {
    const link = createMockLink({ monolith: "available" });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toContainEqual({ type: "format", label: "Webpage", format: "webpage" });
  });

  it("returns Screenshot format badge when image is available", () => {
    const link = createMockLink({ image: "available" });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toContainEqual({ type: "format", label: "Screenshot", format: "screenshot" });
  });

  it("returns empty array when no badges available", () => {
    const link = createMockLink({
      collection: { id: 1, name: "" },
      tags: [],
      pdf: undefined,
      readable: undefined,
      monolith: undefined,
      image: undefined,
    });
    const badges = getLinkDisplayBadges(link);
    expect(badges).toEqual([]);
  });

  it("combines collection, tags and formats", () => {
    const link = createMockLink({
      collection: { id: 1, name: "Personal" },
      tags: [{ id: 1, name: "bookmark" }],
      pdf: "available",
      readable: "available",
    });
    const badges = getLinkDisplayBadges(link);
    expect(badges.length).toBe(4);
    expect(badges).toContainEqual({ type: "collection", label: "Personal" });
    expect(badges).toContainEqual({ type: "tag", label: "bookmark" });
    expect(badges).toContainEqual({ type: "format", label: "PDF", format: "pdf" });
    expect(badges).toContainEqual({ type: "format", label: "Readable", format: "readable" });
  });
});

describe("getLinkExternalOpenUrl", () => {
  it("keeps http URL as-is", () => {
    expect(getLinkExternalOpenUrl("http://example.com")).toBe("http://example.com");
  });

  it("keeps https URL as-is", () => {
    expect(getLinkExternalOpenUrl("https://secure.example.com/path")).toBe(
      "https://secure.example.com/path"
    );
  });

  it("adds https:// to domain without protocol", () => {
    expect(getLinkExternalOpenUrl("example.com")).toBe("https://example.com");
  });

  it("adds https:// to subdomain without protocol", () => {
    expect(getLinkExternalOpenUrl("docs.example.com")).toBe("https://docs.example.com");
  });

  it("adds https:// to domain with path", () => {
    expect(getLinkExternalOpenUrl("example.com/path/to/page")).toBe(
      "https://example.com/path/to/page"
    );
  });

  it("returns empty string for null", () => {
    expect(getLinkExternalOpenUrl(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(getLinkExternalOpenUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(getLinkExternalOpenUrl("")).toBe("");
  });

  it("returns empty string for whitespace only", () => {
    expect(getLinkExternalOpenUrl("   ")).toBe("");
  });

  it("returns empty string for invalid URL-like strings", () => {
    expect(getLinkExternalOpenUrl("not a domain")).toBe("");
  });

  it("handles URL with port", () => {
    expect(getLinkExternalOpenUrl("localhost:3000")).toBe("https://localhost:3000");
  });

  it("handles subdomain with port", () => {
    expect(getLinkExternalOpenUrl("api.test.io:8080")).toBe("https://api.test.io:8080");
  });

  it("trims whitespace from URL", () => {
    expect(getLinkExternalOpenUrl("  https://example.com  ")).toBe("https://example.com");
  });
});