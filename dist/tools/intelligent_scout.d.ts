/**
 * intelligent_scout — Natural language deal intelligence orchestrator.
 *
 * Use this as the PRIMARY entry point for deal scouting tasks. It parses
 * your intent and coordinates the specialized tools automatically:
 *   "Find HVAC businesses for sale within 50 miles of Reno under $2M"
 *   "Show me plumbing companies in Carson City with SBA loans from 2015-2018"
 *   "What's a pest control company with $800K SDE worth and how should I structure it?"
 * --
 * Runs scout_listings, get_sba_loan_data, estimate_valuation, and structure_deal
 * based on intent, then synthesizes results into an intelligence report.
 */
export interface IntelligenceReport {
    query: string;
    intent: ParsedIntent;
    listings: unknown[];
    sba_loan_opportunities: unknown[];
    valuation_estimate: unknown | null;
    deal_structure: unknown | null;
    comparables: unknown[];
    summary: string;
}
interface ParsedIntent {
    action: "scout" | "value" | "structure" | "research" | "comprehensive";
    sector: string;
    zip_codes: string[];
    keywords: string[];
    max_price: number | null;
    revenue: number | null;
    sde: number | null;
    has_contracts: boolean;
    geography: string | null;
    year_range: [number, number] | null;
}
export declare function intelligentScout(query: string): Promise<IntelligenceReport>;
export {};
//# sourceMappingURL=intelligent_scout.d.ts.map