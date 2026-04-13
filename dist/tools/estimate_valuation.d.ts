/**
 * estimate_valuation — Calculate acquisition valuation range using sector SDE multiples.
 *
 * Use this tool when you have revenue and SDE figures and want to understand
 * what a business is worth in the current M&A market:
 *   "What's an HVAC company with $2M revenue and $400K SDE worth?"
 *   "Value a pest control business with recurring contracts: $1.5M revenue, $350K SDE"
 * --
 * Uses research-backed SDE multiples by sector. Adjusts for contract quality.
 * SDE = Seller Discretionary Earnings (owner comp + net income + add-backs).
 */
export interface ValuationResult {
    low: number;
    mid: number;
    high: number;
    low_multiple: number;
    high_multiple: number;
    sector_normalized: string;
    notes: string;
}
export interface EstimateValuationParams {
    annual_revenue: number;
    sde: number;
    sector: string;
    has_contracts: boolean;
}
export declare function estimateValuation(params: EstimateValuationParams): ValuationResult;
//# sourceMappingURL=estimate_valuation.d.ts.map