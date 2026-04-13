/**
 * scout_listings — Scrape BizBuySell and BizQuest for businesses for sale.
 *
 * Use this tool when you want to find active business listings:
 *   "Find HVAC businesses for sale near Reno, NV"
 *   "Show me plumbing companies under $1M asking price in 89501"
 * --
 * Returns an array of listing objects with price, revenue, and contact details.
 */
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
export declare function scoutListings(params: ScoutListingsParams): Promise<Listing[]>;
//# sourceMappingURL=scout_listings.d.ts.map