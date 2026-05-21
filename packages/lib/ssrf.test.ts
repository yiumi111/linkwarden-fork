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

  it("blocks localhost with trailing dot", () => {
    expect(isHostnameBlockedForServerSideFetch("localhost.")).toBe(true);
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

  it("blocks IPv4-mapped IPv6 addresses", () => {
    expect(isIpAddressBlockedForServerSideFetch("::ffff:127.0.0.1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("::ffff:10.0.0.1")).toBe(true);
    expect(isIpAddressBlockedForServerSideFetch("::127.0.0.1")).toBe(true);
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

  it("blocks hostnames that resolve to multiple IPs including private ones", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("https://example.com", {
        lookup: async () => [
          { address: "93.184.216.34", family: 4 },
          { address: "10.0.0.8", family: 4 }
        ],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks URLs with non-http/https protocols", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("ftp://example.com")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks URLs with mixed-case protocols", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("HTTP://example.com")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
    await expect(
      assertUrlIsSafeForServerSideFetch("Https://example.com")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv6 loopback literals", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks IPv4-mapped IPv6 loopback in URL", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://[::ffff:127.0.0.1]/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks 169.254.169.254 metadata service address", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://169.254.169.254/latest/meta-data/")
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });

  it("blocks hostname with trailing dot that resolves to internal IP", async () => {
    await expect(
      assertUrlIsSafeForServerSideFetch("http://localhost./", {
        lookup: async () => [{ address: "127.0.0.1", family: 4 }],
      })
    ).rejects.toBeInstanceOf(UnsafeUrlError);
  });
});
