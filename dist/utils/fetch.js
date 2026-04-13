/**
 * Retry-aware fetch helper with rate limit handling.
 * Adds exponential backoff and optional Jina.ai proxy for scraping.
 */
const JINA_PREFIX = "https://r.jina.ai/";
export async function fetchWithRetry(url, options = {}) {
    const { maxRetries = 3, timeoutMs = 15000, useJinaProxy = false } = options;
    const targetUrl = useJinaProxy ? `${JINA_PREFIX}${url}` : url;
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        if (attempt > 0) {
            // Exponential backoff: 1s, 2s, 4s
            await delay(1000 * Math.pow(2, attempt - 1));
        }
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), timeoutMs);
            const response = await fetch(targetUrl, {
                signal: controller.signal,
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; DealScout/1.0; +https://github.com/gonzih)",
                    Accept: "text/html,application/json,*/*",
                    ...options.headers,
                },
            });
            clearTimeout(timer);
            if (response.status === 429) {
                // Rate limited — wait longer
                await delay(5000 * (attempt + 1));
                continue;
            }
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return await response.text();
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (lastError.name === "AbortError") {
                lastError = new Error(`Request timed out after ${timeoutMs}ms`);
            }
        }
    }
    throw lastError ?? new Error(`Failed to fetch ${url} after ${maxRetries} attempts`);
}
export async function fetchJson(url, options = {}) {
    const text = await fetchWithRetry(url, {
        ...options,
        headers: { Accept: "application/json", ...options.headers },
    });
    return JSON.parse(text);
}
function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
/**
 * Extract text content between two patterns in an HTML string.
 * Strips all HTML tags from the result.
 */
export function extractBetween(html, startPattern, endPattern) {
    const startIdx = typeof startPattern === "string"
        ? html.indexOf(startPattern)
        : html.search(startPattern);
    if (startIdx === -1)
        return "";
    const slice = html.slice(startIdx);
    const endIdx = typeof endPattern === "string"
        ? slice.indexOf(endPattern)
        : slice.search(endPattern);
    const section = endIdx === -1 ? slice : slice.slice(0, endIdx);
    return stripHtml(section);
}
/** Strip HTML tags and decode common entities */
export function stripHtml(html) {
    return html
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s{2,}/g, " ")
        .trim();
}
/** Parse a dollar amount string into a number (handles $1.2M, $500K, etc.) */
export function parseDollarAmount(str) {
    if (!str)
        return null;
    const cleaned = str.replace(/[$,\s]/g, "");
    const match = cleaned.match(/^([\d.]+)([KMB]?)$/i);
    if (!match)
        return null;
    const value = parseFloat(match[1]);
    const suffix = match[2].toUpperCase();
    if (suffix === "K")
        return value * 1_000;
    if (suffix === "M")
        return value * 1_000_000;
    if (suffix === "B")
        return value * 1_000_000_000;
    return value;
}
//# sourceMappingURL=fetch.js.map