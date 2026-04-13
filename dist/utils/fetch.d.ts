/**
 * Retry-aware fetch helper with rate limit handling.
 * Adds exponential backoff and optional Jina.ai proxy for scraping.
 */
export interface FetchOptions {
    headers?: Record<string, string>;
    useJinaProxy?: boolean;
    maxRetries?: number;
    timeoutMs?: number;
}
export declare function fetchWithRetry(url: string, options?: FetchOptions): Promise<string>;
export declare function fetchJson<T = unknown>(url: string, options?: FetchOptions): Promise<T>;
/**
 * Extract text content between two patterns in an HTML string.
 * Strips all HTML tags from the result.
 */
export declare function extractBetween(html: string, startPattern: RegExp | string, endPattern: RegExp | string): string;
/** Strip HTML tags and decode common entities */
export declare function stripHtml(html: string): string;
/** Parse a dollar amount string into a number (handles $1.2M, $500K, etc.) */
export declare function parseDollarAmount(str: string): number | null;
//# sourceMappingURL=fetch.d.ts.map