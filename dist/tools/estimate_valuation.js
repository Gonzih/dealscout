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
// Research-based SDE multiples for small business acquisitions ($500K–$5M revenue)
// Sources: BizBuySell transaction data, IBBA market reports, M&A advisor benchmarks
const SECTOR_MULTIPLES = {
    hvac: {
        low: 3.0,
        high: 5.0,
        contract_premium: 0.75,
        notes: "HVAC businesses command premium multiples due to recurring service agreements and skilled tech shortage creating moats",
    },
    mechanical: {
        low: 3.0,
        high: 5.0,
        contract_premium: 0.5,
        notes: "Mechanical services similar to HVAC — commercial contracts and maintenance agreements drive higher multiples",
    },
    plumbing: {
        low: 2.5,
        high: 4.0,
        contract_premium: 0.5,
        notes: "Plumbing multiples slightly lower than HVAC; emergency service component adds value",
    },
    electrical: {
        low: 2.5,
        high: 4.0,
        contract_premium: 0.5,
        notes: "Electrical contractors with licensed journeymen trade at premium; licensing creates barriers to entry",
    },
    pest_control: {
        low: 4.0,
        high: 7.0,
        contract_premium: 1.0,
        notes: "Pest control has highest multiples in services — monthly recurring revenue (MRR) treated like SaaS",
    },
    landscaping: {
        low: 2.0,
        high: 3.0,
        contract_premium: 0.5,
        notes: "Landscaping is seasonal and labor-intensive; lower multiples reflect execution risk",
    },
    roofing: {
        low: 2.0,
        high: 3.5,
        contract_premium: 0.25,
        notes: "Roofing is project-based with low recurring revenue — multiples reflect customer concentration risk",
    },
    cleaning: {
        low: 2.0,
        high: 3.5,
        contract_premium: 0.75,
        notes: "Janitorial/cleaning with commercial contracts trade well — high client retention is key value driver",
    },
    general: {
        low: 2.0,
        high: 4.0,
        contract_premium: 0.5,
        notes: "General services — multiple depends heavily on revenue concentration, owner dependency, and contract quality",
    },
};
function normalizeSector(sector) {
    const s = sector.toLowerCase().trim();
    if (s.includes("hvac") || s.includes("heating") || s.includes("cooling") || s.includes("air conditioning"))
        return "hvac";
    if (s.includes("mechanical"))
        return "mechanical";
    if (s.includes("plumb"))
        return "plumbing";
    if (s.includes("electric"))
        return "electrical";
    if (s.includes("pest") || s.includes("extermination") || s.includes("termite"))
        return "pest_control";
    if (s.includes("landscape") || s.includes("lawn") || s.includes("tree"))
        return "landscaping";
    if (s.includes("roof"))
        return "roofing";
    if (s.includes("clean") || s.includes("janitor") || s.includes("maid"))
        return "cleaning";
    return "general";
}
export function estimateValuation(params) {
    const { annual_revenue, sde, sector, has_contracts } = params;
    const sectorKey = normalizeSector(sector);
    const multiples = SECTOR_MULTIPLES[sectorKey];
    // Apply contract premium if business has recurring contracts
    const adjustedLow = multiples.low + (has_contracts ? 0 : -0.25);
    const adjustedHigh = multiples.high + (has_contracts ? multiples.contract_premium : 0);
    // Sanity check: SDE shouldn't exceed 50% of revenue for most service businesses
    // If it does, flag it in notes
    const sdePct = (sde / annual_revenue) * 100;
    let validationNote = "";
    if (sdePct > 50) {
        validationNote = ` NOTE: SDE at ${sdePct.toFixed(0)}% of revenue is unusually high — verify add-backs.`;
    }
    else if (sdePct < 10) {
        validationNote = ` NOTE: SDE at ${sdePct.toFixed(0)}% of revenue is low — check for owner-as-employee risk.`;
    }
    const low = Math.round(sde * Math.max(adjustedLow, 1.0));
    const high = Math.round(sde * Math.max(adjustedHigh, 1.5));
    const mid = Math.round((low + high) / 2);
    // Revenue sanity check (typically 0.5–1.5x revenue)
    const revCheckLow = annual_revenue * 0.3;
    const revCheckHigh = annual_revenue * 2.0;
    let revenueNote = "";
    if (high > revCheckHigh) {
        revenueNote = ` Valuation exceeds 2x revenue — verify SDE figure.`;
    }
    else if (low < revCheckLow) {
        revenueNote = ` Low valuation relative to revenue — may indicate owner-dependent business.`;
    }
    return {
        low,
        mid,
        high,
        low_multiple: parseFloat(adjustedLow.toFixed(2)),
        high_multiple: parseFloat(adjustedHigh.toFixed(2)),
        sector_normalized: sectorKey,
        notes: multiples.notes +
            (has_contracts ? " Recurring contract premium applied." : " No contract premium (no recurring contracts).") +
            validationNote +
            revenueNote,
    };
}
//# sourceMappingURL=estimate_valuation.js.map