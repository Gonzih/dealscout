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
import { fetchJson } from "../utils/fetch.js";
// SBA data.sba.gov CKAN API resource IDs for 7(a) loan data
// These are stable public dataset IDs from the FOIA disclosure dataset
const SBA_7A_RESOURCE_IDS = [
    "aab47963-aa4f-43f1-89e2-3bd4f9f27af8", // 7(a) loans general
    "5eb73be5-8f59-4e31-adef-9b0efd8a1e50", // 7(a) approvals
];
export async function getSbaLoanData(params) {
    const { zip_code, naics_code, year_range } = params;
    const results = [];
    for (const resourceId of SBA_7A_RESOURCE_IDS) {
        try {
            const records = await querySbaResource(resourceId, zip_code, naics_code, year_range);
            results.push(...records);
            if (results.length >= 50)
                break;
        }
        catch (_err) {
            // Try next resource ID
        }
    }
    // Filter by year range if specified
    if (year_range && results.length > 0) {
        const [startYear, endYear] = year_range;
        return results.filter((r) => {
            const year = parseInt(r.approval_date?.slice(0, 4) ?? "0");
            return year >= startYear && year <= endYear;
        });
    }
    return results.slice(0, 50);
}
async function querySbaResource(resourceId, zipCode, naicsCode, yearRange) {
    // Build filter object
    const filters = {
        BorrZip: zipCode,
    };
    if (naicsCode) {
        filters["NaicsCode"] = naicsCode;
    }
    const filtersEncoded = encodeURIComponent(JSON.stringify(filters));
    const url = `https://data.sba.gov/api/3/action/datastore_search?resource_id=${resourceId}&filters=${filtersEncoded}&limit=50`;
    const data = await fetchJson(url, { maxRetries: 3 });
    if (!data?.result?.records) {
        return [];
    }
    return data.result.records
        .map((r) => ({
        borrower_name: String(r.BorrName ?? r["BorrName"] ?? "Unknown").trim(),
        loan_amount: parseFloat(String(r.GrossApproval ?? "0")) || 0,
        approval_date: String(r.ApprovalDate ?? "").trim(),
        naics: String(r.NaicsCode ?? "").trim(),
        city: String(r.BorrCity ?? "").trim(),
        state: String(r.BorrState ?? "").trim(),
        term_months: parseInt(String(r.TermInMonths ?? "0")) || 0,
        zip: String(r.BorrZip ?? zipCode).trim(),
    }))
        .filter((r) => {
        if (!yearRange)
            return true;
        const year = parseInt(r.approval_date.slice(0, 4));
        return year >= yearRange[0] && year <= yearRange[1];
    });
}
//# sourceMappingURL=get_sba_loan_data.js.map