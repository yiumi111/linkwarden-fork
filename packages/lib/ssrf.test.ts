import { describe, expect, it } from "vitest";
import {
  assertUrlIsSafeForServerSideFetch,
  isHostnameBlockedForServerSideFetch,
  isIpAddressBlockedForServerSideFetch,
  UnsafeUrlError,
} from "./ssrf";

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
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
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

  it("blocks IPv4-mapped IPv6 in hex form (loopback)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:7f00:1")).toBe(true);
  });

  it("blocks IPv4-mapped IPv6 in hex form (metadata)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:a9fe:fea9")).toBe(
      true
    );
  });

  it("blocks IPv4-mapped IPv6 full form in hex (loopback)", () => {
    expect(
      isIpAddressBlockedForServerSideFetch("0:0:0:0:0:ffff:7f00:1")
    ).toBe(true);
  });

  it("blocks IPv4-compatible IPv6 (loopback)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::7f00:1")).toBe(true);
  });

  it("blocks IPv4-compatible IPv6 (metadata)", () => {
    expect(isIpAddressBlockedForServerSideFetch("::a9fe:fea9")).toBe(true);
  });

  it("allows IPv4-mapped IPv6 that maps to public IP", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:808:808")).toBe(false);
  });

  it("blocks IPv4-mapped IPv6 URLs in hex form", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::ffff:7f00:1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv4-compatible IPv6 URLs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::7f00:1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks case-insensitive localhost", () => {
    expect(isHostnameBlockedForServerSideFetch("LOCALHOST")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("LocalHost")).toBe(true);
  });

  it("blocks localhost with trailing dot", () => {
    expect(isHostnameBlockedForServerSideFetch("localhost.")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("localhost..")).toBe(true);
  });

  it("blocks non-http/https protocols", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("ftp://example.com/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(
      assertUrlIsSafeForServerSideFetch("file:///etc/passwd")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("allows mixed-case http/https protocols with public IP", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("HTTP://example.com", {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      })
    ).resolves.toBeInstanceOf(URL);
    await expect(
      assertUrlIsSafeForServerSideFetch("HTTPS://example.com", {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      })
    ).resolves.toBeInstanceOf(URL);
  });

  it("blocks DNS resolution returning empty results", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks DNS resolution with mixed public and private IPs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.1", family: 4 },
        ],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("allows private network access when allowPrivateNetworkAccess is true", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [{ address: "10.0.0.1", family: 4 }],
        allowPrivateNetworkAccess: true,
      })
    ).resolves.toBeInstanceOf(URL);
  });

  it("blocks IPv4-mapped IPv6 in hex form resolved via DNS", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [{ address: "::ffff:7f00:1", family: 6 }],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
