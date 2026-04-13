/**
 * structure_deal — Tax-efficient acquisition structure calculator.
 *
 * Use this tool when you have a deal under consideration and want to model
 * financing structures, tax implications, and required equity:
 *   "Structure a $1.5M acquisition — seller is 62, earns $200K/year"
 *   "Compare all-cash vs seller-financed deal for $2.5M asking price"
 * --
 * Models: asset vs stock purchase, seller note sizing, SBA 7(a) loan, installment sale tax.
 * Key insight: installment sale on seller note spreads capital gains — saves seller $50K+.
 */
export interface DealStructureResult {
    recommended_structure: string;
    purchase_price: number;
    equity_required: number;
    sba_loan_amount: number;
    seller_note_amount: number;
    annual_debt_service: number;
    monthly_debt_service: number;
    estimated_seller_tax_savings: number;
    seller_effective_tax_rate_installment: number;
    seller_effective_tax_rate_lump_sum: number;
    recommended_purchase_type: "asset" | "stock";
    annual_depreciation_shield: number;
    estimated_dscr: number;
    notes: string;
}
export interface StructureDealParams {
    purchase_price: number;
    asset_value: number;
    seller_age: number;
    seller_annual_income: number;
}
export declare function structureDeal(params: StructureDealParams): DealStructureResult;
//# sourceMappingURL=structure_deal.d.ts.map