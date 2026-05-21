import { describe, expect, it } from "vitest";
import {
  assertUrlIsSafeForServerSideFetch,
  isHostnameBlockedForServerSideFetch,
  isIpAddressBlockedForServerSideFetch,
  UnsafeUrlError,
} from "./ssrf";

describe("ssrf guard", () => {
  it("blocks localhost hostnames including trailing dots", () => {
    expect(isHostnameBlockedForServerSideFetch("localhost")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("localhost.")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("subdomain.localhost")).toBe(
      true
    );
  });

  it("blocks single-label internal hostnames", () => {
    expect(isHostnameBlockedForServerSideFetch("meilisearch")).toBe(true);
    expect(isHostnameBlockedForServerSideFetch("postgres")).toBe(true);
  });

  it("blocks private, metadata, and mapped loopback IP literals", () => {
    expect(isIpAddressBlockedForServerSideFetch("127.0.0.1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("169.254.169.254")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("::1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("fc00::1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("::ffff:127.0.0.1")).toBe(
      true
    );
    expect(isIpAddressBlockedForServerSideFetch("::ffff:7f00:1")).toBe(true);
  });

  it("allows normal public http and https URLs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("HTTP://Example.com", {
        lookup: async () => [{ address: "93.184.216.34", family: 4 }],
      })
    ).resolves.toBeInstanceOf(URL);

    await expect(
      assertUrlIsSafeForServerSideFetch(
        "https://[2606:2800:220:1:248:1893:25c8:1946]/"
      )
    ).resolves.toBeInstanceOf(URL);
  });

  it("blocks non-http protocols even when protocol casing is mixed", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("JaVaScRiPt:alert(1)")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks hostnames that resolve to any private or metadata IP", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.8", family: 4 },
        ],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);

    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [{ address: "169.254.169.254", family: 4 }],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);

    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [{ address: "::ffff:7f00:1", family: 6 }],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks empty DNS answers", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv6 loopback literals", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv4-mapped IPv6 loopback literals", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::ffff:127.0.0.1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("keeps allowPrivateNetworkAccess semantics for private http URLs", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://localhost./", {
        allowPrivateNetworkAccess: true,
      })
    ).resolves.toBeInstanceOf(URL);

    await expect(
      assertUrlIsSafeForServerSideFetch("file:///etc/passwd", {
        allowPrivateNetworkAccess: true,
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
