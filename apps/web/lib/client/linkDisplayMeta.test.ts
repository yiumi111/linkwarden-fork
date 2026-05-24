import { describe, expect, it } from "vitest";
import {
  getLinkDisplayTitle,
  getLinkDisplaySubtitle,
  getLinkDisplayBadges,
  getLinkExternalOpenUrl,
} from "./linkDisplayMeta";
import { ArchivedFormat } from "@linkwarden/types/global";

describe("linkDisplayMeta", () => {
  describe("getLinkDisplayTitle", () => {
    it("should return trimmed link name when available", () => {
      expect(getLinkDisplayTitle({ name: "  Hello World  " })).toBe(
        "Hello World"
      );
    });

    it("should return hostname when no name but url available", () => {
      expect(getLinkDisplayTitle({ url: "https://example.com/path" })).toBe(
        "example.com"
      );
    });

    it("should return original url when hostname extraction fails", () => {
      expect(getLinkDisplayTitle({ url: "invalid-url" })).toBe("invalid-url");
    });

    it("should return empty string when neither name nor url available", () => {
      expect(getLinkDisplayTitle({})).toBe("");
    });

    it("should handle name with only whitespace", () => {
      expect(getLinkDisplayTitle({ name: "   ", url: "https://test.com" })).toBe(
        "test.com"
      );
    });
  });

  describe("getLinkDisplaySubtitle", () => {
    it("should return hostname when url available", () => {
      expect(getLinkDisplaySubtitle({ url: "https://example.com/path" })).toBe(
        "example.com"
      );
    });

    it("should return short description when no hostname but description available", () => {
      expect(
        getLinkDisplaySubtitle({ description: "This is a test description" })
      ).toBe("This is a test description");
    });

    it("should truncate long description", () => {
      const longDesc = "a".repeat(200);
      const result = getLinkDisplaySubtitle({ description: longDesc });
      expect(result).toBe("a".repeat(97) + "...");
    });

    it("should return empty string when neither hostname nor description available", () => {
      expect(getLinkDisplaySubtitle({})).toBe("");
    });

    it("should prefer hostname over description", () => {
      expect(
        getLinkDisplaySubtitle({
          url: "https://example.com",
          description: "Test description",
        })
      ).toBe("example.com");
    });
  });

  describe("getLinkDisplayBadges", () => {
    it("should return collection badge when collection available", () => {
      const badges = getLinkDisplayBadges({
        collection: { name: "My Collection" },
      });
      expect(badges).toHaveLength(1);
      expect(badges[0].type).toBe("collection");
      expect(badges[0].value).toBe("My Collection");
    });

    it("should return tag badges when tags available", () => {
      const badges = getLinkDisplayBadges({
        tags: [{ name: "tag1" }, { name: "tag2" }],
      });
      expect(badges).toHaveLength(2);
      expect(badges[0].type).toBe("tag");
      expect(badges[0].value).toBe("tag1");
      expect(badges[1].type).toBe("tag");
      expect(badges[1].value).toBe("tag2");
    });

    it("should return preserved format badges when formats available", () => {
      const badges = getLinkDisplayBadges({
        pdf: "available",
        readable: "available",
        monolith: "available",
        image: "available.jpg",
      });
      expect(badges).toHaveLength(4);
      expect(badges.some((b) => b.value === "PDF")).toBe(true);
      expect(badges.some((b) => b.value === "Readable")).toBe(true);
      expect(badges.some((b) => b.value === "Webpage")).toBe(true);
      expect(badges.some((b) => b.value === "Screenshot")).toBe(true);
    });

    it("should ignore unavailable formats", () => {
      const badges = getLinkDisplayBadges({
        pdf: "unavailable",
        readable: "available",
      });
      expect(badges).toHaveLength(1);
      expect(badges[0].value).toBe("Readable");
    });

    it("should return empty array when nothing available", () => {
      expect(getLinkDisplayBadges({})).toEqual([]);
    });

    it("should return all types of badges together", () => {
      const badges = getLinkDisplayBadges({
        collection: { name: "My Collection" },
        tags: [{ name: "tag1" }],
        pdf: "available",
      });
      expect(badges).toHaveLength(3);
    });

    it("should handle correct ArchivedFormat for screenshot", () => {
      const badges1 = getLinkDisplayBadges({ image: "test.png" });
      expect(badges1[0].format).toBe(ArchivedFormat.png);

      const badges2 = getLinkDisplayBadges({ image: "test.jpg" });
      expect(badges2[0].format).toBe(ArchivedFormat.jpeg);
    });
  });

  describe("getLinkExternalOpenUrl", () => {
    it("should return original url when https protocol present", () => {
      expect(getLinkExternalOpenUrl({ url: "https://example.com" })).toBe(
        "https://example.com"
      );
    });

    it("should return original url when http protocol present", () => {
      expect(getLinkExternalOpenUrl({ url: "http://example.com" })).toBe(
        "http://example.com"
      );
    });

    it("should add https protocol when missing but looks like domain", () => {
      expect(getLinkExternalOpenUrl({ url: "example.com" })).toBe(
        "https://example.com"
      );
    });

    it("should return empty string for invalid url", () => {
      expect(getLinkExternalOpenUrl({ url: "invalid" })).toBe("");
    });

    it("should return empty string when url is empty", () => {
      expect(getLinkExternalOpenUrl({ url: "" })).toBe("");
    });

    it("should return empty string when url is only whitespace", () => {
      expect(getLinkExternalOpenUrl({ url: "   " })).toBe("");
    });

    it("should return empty string when url not provided", () => {
      expect(getLinkExternalOpenUrl({})).toBe("");
    });
  });

  describe("empty link", () => {
    it("should handle all empty fields gracefully", () => {
      const emptyLink = {};
      expect(getLinkDisplayTitle(emptyLink)).toBe("");
      expect(getLinkDisplaySubtitle(emptyLink)).toBe("");
      expect(getLinkDisplayBadges(emptyLink)).toEqual([]);
      expect(getLinkExternalOpenUrl(emptyLink)).toBe("");
    });
  });
});
