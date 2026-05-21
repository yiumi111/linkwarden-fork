import {
  assertUrlIsSafeForServerSideFetch,
  isHostnameBlockedForServerSideFetch,
  isIpAddressBlockedForServerSideFetch,
  UnsafeUrlError,
} from './packages/lib/ssrf';

async function runTests() {
  console.log('=== Testing SSRF Fixes ===\n');

  // Test 1: Localhost with trailing dot
  console.log('Test 1: localhost with trailing dot');
  try {
    const result = isHostnameBlockedForServerSideFetch('localhost.');
    console.log(`  Result: ${result ? '✓ BLOCKED' : '✗ NOT blocked'}`);
  } catch (e) {
    console.log(`  Error: ${e}`);
  }

  // Test 2: IPv4-mapped IPv6 address
  console.log('\nTest 2: IPv4-mapped IPv6 (::ffff:127.0.0.1)');
  try {
    const result = isIpAddressBlockedForServerSideFetch('::ffff:127.0.0.1');
    console.log(`  Result: ${result ? '✓ BLOCKED' : '✗ NOT blocked'}`);
  } catch (e) {
    console.log(`  Error: ${e}`);
  }

  // Test 3: Metadata address 169.254.169.254
  console.log('\nTest 3: Metadata address (169.254.169.254)');
  try {
    const result = isIpAddressBlockedForServerSideFetch('169.254.169.254');
    console.log(`  Result: ${result ? '✓ BLOCKED' : '✗ NOT blocked'}`);
  } catch (e) {
    console.log(`  Error: ${e}`);
  }

  // Test 4: Mixed case protocol (HTTP://)
  console.log('\nTest 4: Mixed case protocol (HTTP://example.com)');
  try {
    const mockLookup = async () => [{ address: '93.184.216.34', family: 4 }];
    await assertUrlIsSafeForServerSideFetch('HTTP://example.com', { lookup: mockLookup });
    console.log('  Result: ✗ NOT blocked (should be blocked!)');
  } catch (e) {
    if (e instanceof UnsafeUrlError) {
      console.log(`  Result: ✓ BLOCKED with message: "${e.message}"`);
    } else {
      console.log(`  Unexpected error: ${e}`);
    }
  }

  // Test 5: Normal HTTPS URL (should pass)
  console.log('\nTest 5: Normal HTTPS URL (should pass)');
  try {
    const mockLookup = async () => [{ address: '93.184.216.34', family: 4 }];
    const url = await assertUrlIsSafeForServerSideFetch('https://example.com', { lookup: mockLookup });
    console.log(`  Result: ✓ PASSED, returned URL: ${url}`);
  } catch (e) {
    console.log(`  Result: ✗ FAILED unexpectedly: ${e}`);
  }

  // Test 6: DNS with mixed public and private IPs
  console.log('\nTest 6: DNS resolving to mixed public and private IPs');
  try {
    const mockLookup = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.1', family: 4 }
    ];
    await assertUrlIsSafeForServerSideFetch('https://example.com', { lookup: mockLookup });
    console.log('  Result: ✗ NOT blocked (should be blocked!)');
  } catch (e) {
    if (e instanceof UnsafeUrlError) {
      console.log(`  Result: ✓ BLOCKED with message: "${e.message}"`);
    } else {
      console.log(`  Unexpected error: ${e}`);
    }
  }

  console.log('\n=== All tests completed ===');
}

runTests().catch(console.error);
