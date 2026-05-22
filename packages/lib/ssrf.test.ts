import { describe, expect, it } from "vitest";
import {
  assertUrlIsSafeForServerSideFetch,
  isHostnameBlockedForServerSideFetch,
  isIpAddressBlockedForServerSideFetch,
  UnsafeUrlError,
} from "./ssrf";

const publicLookup4 = async () => [{ address: "93.184.216.34", family: 4 as const }];
const publicLookup6 = async () => [{ address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 as const }];

describe("ssrf guard", () => {
  it("blocks localhost hostnames", () => {
    expect(isHostnameBlockedForServerSideFetch("localhost")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("subdomain.localhost")).toBe(
      true
    );
  });

  it("blocks single-label internal hostnames", () => {
    expect(isHostnameBlockedForServerSideFetch("meilisearch")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("postgres")).toBe(true);
  });

  it("blocks private and loopback IP literals", () => {
    expect(isIpAddressBlockedForServerSideFetch("127.0.0.1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("169.254.169.254")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("::1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("fc00::1")).toBe(true);
  });

  it("allows public hostnames that resolve to public IPs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: publicLookup4,
      })
    ).resolves.toBeInstanceOf(URL);
  });

  it("blocks hostnames that resolve to private IPs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [{ address: "10.0.0.8", family: 4 }],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv6 loopback literals", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks mixed-case protocol (http)", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("HTtp://127.0.0.1/", {
        lookup: publicLookup4,
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks mixed-case protocol (https)", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("HtTpS://127.0.0.1/", {
        lookup: publicLookup4,
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks non-http/https protocols", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("file:///etc/passwd")
    ).rejects.toBeInstanceOf(UnsafeUrlError);

    await expect(
      assertUrlIsSafeForServerSideFetch("ftp://evil.com/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);

    await expect(
      assertUrlIsSafeForServerSideFetch("gopher://localhost/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks URL with empty hostname", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http:///path")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks pure-hex IPv4-mapped IPv6 loopback (::ffff:7f00:1)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:7f00:1")).toBe(true);
  });

  it("blocks pure-hex IPv4-mapped IPv6 metadata (::ffff:a9fe:a9fe)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:a9fe:a9fe")).toBe(true);
  });

  it("blocks pure-hex IPv4-mapped IPv6 private range (::ffff:c0a8:1)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:c0a8:1")).toBe(true);
  });

  it("blocks pure-hex IPv4-mapped IPv6 private range (::ffff:ac10:2)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:ac10:2")).toBe(true);
  });

  it("blocks pure-hex IPv4-mapped IPv6 private range (::ffff:a00:5)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:a00:5")).toBe(true);
  });

  it("allows pure-hex IPv4-mapped IPv6 public address (::ffff:5db8:d822)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:5db8:d822")).toBe(false);
  });

  it("blocks IPv4-compatible IPv6 loopback (::7f00:1)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::7f00:1")).toBe(true);
  });

  it("blocks IPv4-compatible IPv6 metadata (::a9fe:a9fe)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::a9fe:a9fe")).toBe(true);
  });

  it("blocks IPv4-compatible IPv6 private range (::c0a8:1)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::c0a8:1")).toBe(true);
  });

  it("allows IPv4-compatible IPv6 public address (::5db8:d822)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::5db8:d822")).toBe(false);
  });

  it("blocks dotted-decimal IPv4-mapped IPv6 loopback (::ffff:127.0.0.1)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:127.0.0.1")).toBe(true);
  });

  it("blocks dotted-decimal IPv4-mapped IPv6 metadata (::ffff:169.254.169.254)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:169.254.169.254")).toBe(true);
  });

  it("blocks IPv4 embedded in IPv6 URL literal (pure hex)", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::ffff:a9fe:a9fe]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv4 embedded in IPv6 URL literal (dotted decimal)", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::ffff:127.0.0.1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv4-compatible IPv6 URL literal", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::7f00:1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("allows public IPv4-mapped IPv6 URL literal", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::ffff:5db8:d822]/")
    ).resolves.toBeInstanceOf(URL);
  });

  it("blocks hostname where DNS resolves to mixed public + private IPs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://mixed.example", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.8", family: 4 },
        ],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks hostname where DNS resolves to zero addresses", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://empty.example", {
        lookup: async () => [],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks hostname where DNS lookup throws ENOTFOUND", async () => {
    const enotfound = new Error("getaddrinfo ENOTFOUND empty.example");
    (enotfound as any).code = "ENOTFOUND";

    await expect(
      assertUrlIsSafeForServerSideFetch("https://empty.example", {
        lookup: async () => {
          throw enotfound;
        },
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("allows public hostname resolving to public IPv4", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: publicLookup4,
      })
    ).resolves.toBeInstanceOf(URL);
  });

  it("allows public hostname resolving to public IPv6", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: publicLookup6,
      })
    ).resolves.toBeInstanceOf(URL);
  });

  it("allows public hostname resolving to both public IPv4 and IPv6", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "2606:2800:220:1:248:1893:25c8:1946", family: 6 },
        ],
      })
    ).resolves.toBeInstanceOf(URL);
  });

  it("blocks hostname resolving to private IPv6", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://internal.example", {
        lookup: async () => [{ address: "fc00::1", family: 6 }],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("skips SSRF checks when allowPrivateNetworkAccess is true", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://10.0.0.8", {
        allowPrivateNetworkAccess: true,
      })
    ).resolves.toBeInstanceOf(URL);
  });
});