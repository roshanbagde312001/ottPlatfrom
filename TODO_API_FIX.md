# Anime Module API Fix - COMPLETED

## Issue Fixed: APIs hitting multiple times with automatic retries

## Root Causes Identified and Fixed:
1. React useEffect dependency issues causing re-renders and duplicate calls ✅ FIXED
2. Incomplete request deduplication in anime.js ✅ FIXED
3. Multiple abort managers creating race conditions ✅ FIXED
4. Cache not being properly used across components ✅ FIXED

## Changes Made:

### Step 1: Fixed src/services/anime.js
- ✅ Added `getOrCreateRequest` from apiCache.js for all API calls
- ✅ Removed unreliable `requestTrackers` Map
- ✅ Added centralized deduplication using in-flight request tracking
- ✅ Added unique request IDs to prevent automatic retries
- ✅ Proper cache key generation for all endpoints
- ✅ Added proper error handling to prevent automatic retries on cancellation

### Step 2: Fixed src/pages/AnimePlayer.jsx
- ✅ Added `isMounted` flag to all useEffects to prevent state updates on unmounted components
- ✅ Added `AbortController` to all API calls
- ✅ Added fetch flags (`episodesFetched`, `serversFetched`, `streamFetched`) to prevent duplicate fetches
- ✅ Added proper cleanup functions to abort pending requests
- ✅ Removed `episodeData` from dependency array (was causing unnecessary re-fetches)

### Step 3: Fixed src/pages/AnimeDetails.jsx
- ✅ Fixed useEffect dependency chains
- ✅ Added proper cleanup for all API calls
- ✅ Removed deprecated `safeFetch` import and used `getAnimeDetails`
- ✅ Added proper signal handling for all API calls
- ✅ Fixed parallel fetch with proper error handling

### Step 4: Fixed src/pages/AnimeBrowse.jsx
- ✅ Fixed useEffect that fetches home data
- ✅ Added `isMounted` and `homeFetched` flags to prevent duplicate fetches
- ✅ Added proper cleanup for home data fetch

## How the Fix Works:

1. **Centralized Deduplication**: The `getOrCreateRequest` function in apiCache.js ensures that only one request is made for each unique cache key. If a request is already in-flight, subsequent calls will return the same promise.

2. **Component-Level Prevention**: Each useEffect now has:
   - `isMounted` flag to prevent state updates after unmount
   - Fetch flags to prevent duplicate fetches within the same render
   - AbortController to cancel pending requests on cleanup
   - Proper error handling for cancellation

3. **Request Tracking**: Each API function now uses unique request IDs that include the endpoint and parameters, making it easy to track and deduplicate requests.

## Result:
- APIs are now called only ONCE per unique request
- No more automatic retries causing multiple API hits
- Proper cleanup prevents memory leaks
- Better user experience with faster load times

---

## Retry Configuration Feature (NEW)

### Feature Overview
Added configurable retry logic for proxy-related API calls to prevent excessive retries when the proxy fails.

### New Exports

```javascript
// Retry Configuration
retryConfig           // Configuration object for retry behavior
setRetryConfig()     // Function to update retry settings
getRetryConfig()     // Function to get current retry settings
fetchWithRetry()     // Utility function for making requests with retry
```

### Default Configuration

```javascript
retryConfig = {
  maxRetries: 3,        // Maximum retry attempts
  baseDelay: 1000,       // Base delay in ms (exponential backoff)
  maxDelay: 10000,      // Maximum delay cap in ms
  jitterFactor: 0.3,    // Jitter randomness (0-1)
  retryStatusCodes: [408, 429, 500, 502, 503, 504],  // HTTP codes to retry
  retryErrorTypes: ['network-error', 'fetch-error', 'timeout'],  // Error types to retry
  proxyOnly: true,      // Only retry proxied requests
  shouldRetry: null,    // Custom retry predicate function
  onRetry: null,        // Callback on retry attempt
}
```

### Usage Examples

#### 1. Configure Global Retry Settings

```javascript
import { setRetryConfig } from '../services/anime';

// Reduce retries for faster failure
setRetryConfig({
  maxRetries: 2,
  baseDelay: 500,
  maxDelay: 3000,
});

// Or increase retries for unreliable connections
setRetryConfig({
  maxRetries: 5,
  baseDelay: 2000,
  maxDelay: 15000,
});
```

#### 2. Use fetchWithRetry for Individual Requests

```javascript
import { fetchWithRetry, getRetryConfig } from '../services/anime';

try {
  const response = await fetchWithRetry(url, {
    method: 'GET',
    headers: { 'Accept': 'application/json' },
    timeout: 15000,
  }, {
    maxRetries: 3,
    baseDelay: 1000,
  });
  const data = await response.json();
  return data;
} catch (error) {
  console.error('Request failed:', error);
}
```

#### 3. Use fetchSubtitleContent with Custom Retry Settings

```javascript
import { fetchSubtitleContent } from '../services/anime';

// Default: uses retryConfig settings
const result = await fetchSubtitleContent(subtitleUrl);

// Custom retry settings
const result = await fetchSubtitleContent(subtitleUrl, {
  retryOnFailure: true,
  maxRetries: 2,
  timeout: 10000,
});

// Disable retries for testing
const result = await fetchSubtitleContent(subtitleUrl, {
  retryOnFailure: false,
});
```

#### 4. Custom Retry Predicate

```javascript
import { setRetryConfig } from '../services/anime';

setRetryConfig({
  shouldRetry: (error, attempt, config) => {
    // Don't retry on 404 errors
    if (error.message && error.message.includes('404')) {
      return false;
    }
    // Custom logic: retry only if less than 3 attempts
    return attempt < 3;
  },
});
```

#### 5. Retry Callback

```javascript
import { setRetryConfig } from '../services/anime';

setRetryConfig({
  onRetry: (error, attempt, delay, config) => {
    console.log(`Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
    console.log('Error:', error.message);
    // Could trigger analytics, UI update, etc.
  },
});
```

### Behavior

1. **Exponential Backoff with Jitter**: Each retry waits longer than the previous (1s, 2s, 4s...) with random jitter to prevent thundering herd
2. **Retry on Failure**: Automatically retries on network errors, timeouts, and server errors (5xx, 429)
3. **No Retry on Abort**: Aborted requests don't trigger retries
4. **Proxy-Aware**: By default, retry only applies to proxied requests (configurable via `proxyOnly`)
5. **Configurable**: All settings can be customized globally or per-request

### Best Practices

- Use lower `maxRetries` and `baseDelay` for better UX (faster failure feedback)
- Use higher values for unreliable networks or critical operations
- Use `onRetry` callback for logging/monitoring retry attempts
- Set appropriate `timeout` values (shorter for subtitle fetches, longer for video streams)

