/**
 * get_sba_loan_data — Query public SBA 7(a) loan FOIA dataset via data.sba.gov.
 *
 * Use this tool when you want to identify businesses with maturing SBA loans
 * (motivated sellers), or understand lending patterns in a zip code/sector:
 *   "Find businesses with SBA loans in 89501 approved 2015-2018"
 *   "Show HVAC companies (NAICS 238220) that got 7a loans in Reno area"
 * --
 * Businesses with 7(a) loans 5-10 years ago are prime motivated-seller targets:
 * loan maturities + owner fatigue = acquisition opportunity.
 */
export interface SbaLoanRecord {
    borrower_name: string;
    loan_amount: number;
    approval_date: string;
    naics: string;
    city: string;
    state: string;
    term_months: number;
    zip: string;
}
export interface GetSbaLoanDataParams {
    zip_code: string;
    naics_code?: string;
    year_range?: [number, number];
}
export declare function getSbaLoanData(params: GetSbaLoanDataParams): Promise<SbaLoanRecord[]>;
//# sourceMappingURL=get_sba_loan_data.d.ts.map