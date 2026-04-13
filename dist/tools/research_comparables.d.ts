/**
 * research_comparables — Find recent small business PE deals and comp transactions.
 *
 * Use this tool when you need market context to validate a valuation or understand
 * deal flow activity in a sector:
 *   "What are recent HVAC acquisitions in the Southwest under $3M?"
 *   "Find comparable pest control transactions to validate a 5x multiple"
 * --
 * Scrapes Axial forum deal flow data and BizBuySell sold listings.
 * Returns implied multiples and deal descriptions.
 */
export interface ComparableTransaction {
    transaction_description: string;
    implied_multiple: number | null;
    date: string;
    revenue_range: string;
    geography: string;
    notes: string;
    source: string;
}
export interface ResearchComparablesParams {
    sector: string;
    revenue_range: [number, number];
    geography?: string;
}
export declare function researchComparables(params: ResearchComparablesParams): Promise<ComparableTransaction[]>;
//# sourceMappingURL=research_comparables.d.ts.map