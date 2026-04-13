/**
 * scout_listings — Scrape BizBuySell and BizQuest for businesses for sale.
 *
 * Use this tool when you want to find active business listings:
 *   "Find HVAC businesses for sale near Reno, NV"
 *   "Show me plumbing companies under $1M asking price in 89501"
 * --
 * Returns an array of listing objects with price, revenue, and contact details.
 */

import { fetchWithRetry, parseDollarAmount, stripHtml } from "../utils/fetch.js";

export interface Listing {
  name: string;
  asking_price: number | null;
  revenue: number | null;
  cash_flow: number | null;
  location: string;
  listing_url: string;
  days_on_market: number | null;
  source: string;
}

export interface ScoutListingsParams {
  zip_codes: string[];
  keywords: string[];
  max_asking_price?: number;
}

export async function scoutListings(params: ScoutListingsParams): Promise<Listing[]> {
  const { zip_codes, keywords, max_asking_price } = params;
  const results: Listing[] = [];

  for (const zip of zip_codes) {
    for (const keyword of keywords) {
      // Try BizBuySell
      try {
        const bizbuysellResults = await scrapeBizBuySell(zip, keyword, max_asking_price);
        results.push(...bizbuysellResults);
      } catch (_err) {
        // Silently continue — scraping may fail on certain queries
      }

      // Try BizQuest
      try {
        const bizquestResults = await scrapeBizQuest(zip, keyword, max_asking_price);
        results.push(...bizquestResults);
      } catch (_err) {
        // Silently continue
      }
    }
  }

  // Deduplicate by listing_url
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.listing_url)) return false;
    seen.add(r.listing_url);
    return true;
  });
}

async function scrapeBizBuySell(
  zip: string,
  keyword: string,
  maxPrice?: number
): Promise<Listing[]> {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://www.bizbuysell.com/businesses-for-sale/?q=${encodedKeyword}&address=${zip}&within=50`;
  const html = await fetchWithRetry(url, { useJinaProxy: true, maxRetries: 2 });
  return parseBizBuySellHtml(html, maxPrice);
}

function parseBizBuySellHtml(html: string, maxPrice?: number): Listing[] {
  const listings: Listing[] = [];

  // Match listing cards — BizBuySell uses data attributes and structured HTML
  // Pattern: find listing titles, prices, and URLs
  const listingBlocks = html.split(/(?=<(?:div|article)[^>]*(?:listing|result|business)[^>]*>)/i);

  for (const block of listingBlocks) {
    // Extract business name
    const nameMatch = block.match(/<h\d[^>]*class="[^"]*(?:title|name|heading)[^"]*"[^>]*>\s*([^<]+)/i)
      ?? block.match(/class="listing[_-]title[^"]*"[^>]*>\s*([^<]+)/i);
    if (!nameMatch) continue;

    const name = stripHtml(nameMatch[1]).trim();
    if (!name || name.length < 3) continue;

    // Asking price
    const priceMatch = block.match(/(?:asking|price)[^$]*\$?([\d,.]+\s*[KMB]?)/i);
    const asking_price = priceMatch ? parseDollarAmount(priceMatch[1]) : null;

    if (maxPrice && asking_price && asking_price > maxPrice) continue;

    // Revenue
    const revenueMatch = block.match(/(?:revenue|sales)[^$]*\$?([\d,.]+\s*[KMB]?)/i);
    const revenue = revenueMatch ? parseDollarAmount(revenueMatch[1]) : null;

    // Cash flow / SDE
    const cfMatch = block.match(/(?:cash.?flow|sde|earnings)[^$]*\$?([\d,.]+\s*[KMB]?)/i);
    const cash_flow = cfMatch ? parseDollarAmount(cfMatch[1]) : null;

    // Location
    const locMatch = block.match(/(?:location|city)[^>]*>([^<]+)/i)
      ?? block.match(/,\s*([A-Z]{2}\s+\d{5})/);
    const location = locMatch ? stripHtml(locMatch[1]).trim() : "Unknown";

    // Days on market
    const domMatch = block.match(/(\d+)\s*days?/i);
    const days_on_market = domMatch ? parseInt(domMatch[1]) : null;

    // URL
    const urlMatch = block.match(/href="(\/[^"]*(?:listing|business)[^"]*\d+[^"]*)"/i);
    const listing_url = urlMatch
      ? `https://www.bizbuysell.com${urlMatch[1]}`
      : "https://www.bizbuysell.com";

    listings.push({ name, asking_price, revenue, cash_flow, location, listing_url, days_on_market, source: "BizBuySell" });
  }

  return listings.slice(0, 20);
}

async function scrapeBizQuest(
  zip: string,
  keyword: string,
  maxPrice?: number
): Promise<Listing[]> {
  const encodedKeyword = encodeURIComponent(keyword);
  const url = `https://www.bizquest.com/businesses-for-sale/?zip=${zip}&industry=${encodedKeyword}`;
  const html = await fetchWithRetry(url, { useJinaProxy: true, maxRetries: 2 });
  return parseBizQuestHtml(html, maxPrice);
}

function parseBizQuestHtml(html: string, maxPrice?: number): Listing[] {
  const listings: Listing[] = [];

  const rows = html.split(/(?=<(?:div|li)[^>]*(?:listing|result)[^>]*>)/i);

  for (const row of rows) {
    const nameMatch = row.match(/<a[^>]*class="[^"]*(?:title|name)[^"]*"[^>]*>([^<]+)/i)
      ?? row.match(/class="biz[_-]title[^"]*"[^>]*>([^<]+)/i);
    if (!nameMatch) continue;

    const name = stripHtml(nameMatch[1]).trim();
    if (!name || name.length < 3) continue;

    const priceMatch = row.match(/\$\s*([\d,.]+\s*[KMB]?)/i);
    const asking_price = priceMatch ? parseDollarAmount(priceMatch[1]) : null;

    if (maxPrice && asking_price && asking_price > maxPrice) continue;

    const revenueMatch = row.match(/revenue[^$]*\$?([\d,.]+\s*[KMB]?)/i);
    const revenue = revenueMatch ? parseDollarAmount(revenueMatch[1]) : null;

    const cfMatch = row.match(/cash.?flow[^$]*\$?([\d,.]+\s*[KMB]?)/i);
    const cash_flow = cfMatch ? parseDollarAmount(cfMatch[1]) : null;

    const locMatch = row.match(/([A-Za-z\s]+,\s*[A-Z]{2})/);
    const location = locMatch ? locMatch[1].trim() : "Unknown";

    const domMatch = row.match(/(\d+)\s*days?/i);
    const days_on_market = domMatch ? parseInt(domMatch[1]) : null;

    const urlMatch = row.match(/href="(\/[^"]*\d+[^"]*)"/i);
    const listing_url = urlMatch
      ? `https://www.bizquest.com${urlMatch[1]}`
      : "https://www.bizquest.com";

    listings.push({ name, asking_price, revenue, cash_flow, location, listing_url, days_on_market, source: "BizQuest" });
  }

  return listings.slice(0, 20);
}
