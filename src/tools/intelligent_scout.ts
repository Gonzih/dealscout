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

import { scoutListings } from "./scout_listings.js";
import { getSbaLoanData } from "./get_sba_loan_data.js";
import { estimateValuation } from "./estimate_valuation.js";
import { structureDeal } from "./structure_deal.js";
import { researchComparables } from "./research_comparables.js";

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

// Nevada zip codes for major population centers
const NEVADA_ZIPS: Record<string, string[]> = {
  reno: ["89501", "89502", "89503", "89505", "89506", "89509", "89511", "89512"],
  "carson city": ["89701", "89702", "89703", "89706"],
  "sparks": ["89431", "89432", "89434", "89436"],
  "lyon county": ["89403", "89408", "89410", "89413", "89429"],
  "henderson": ["89002", "89014", "89015", "89052", "89074"],
  "las vegas": ["89101", "89102", "89103", "89104", "89106", "89107"],
};

export async function intelligentScout(query: string): Promise<IntelligenceReport> {
  const intent = parseQuery(query);
  const report: IntelligenceReport = {
    query,
    intent,
    listings: [],
    sba_loan_opportunities: [],
    valuation_estimate: null,
    deal_structure: null,
    comparables: [],
    summary: "",
  };

  const tasks: Promise<void>[] = [];

  // Scout listings if intent includes scouting
  if (intent.action === "scout" || intent.action === "comprehensive") {
    if (intent.zip_codes.length > 0) {
      tasks.push(
        scoutListings({
          zip_codes: intent.zip_codes,
          keywords: intent.keywords,
          max_asking_price: intent.max_price ?? undefined,
        }).then((listings) => {
          report.listings = listings;
        }).catch(() => {
          report.listings = [];
        })
      );
    }
  }

  // Get SBA loan data for motivated seller identification
  if ((intent.action === "scout" || intent.action === "comprehensive") && intent.zip_codes.length > 0) {
    const primaryZip = intent.zip_codes[0];
    tasks.push(
      getSbaLoanData({
        zip_code: primaryZip,
        year_range: intent.year_range ?? [2013, 2019], // loans maturing now
      }).then((loans) => {
        report.sba_loan_opportunities = loans;
      }).catch(() => {
        report.sba_loan_opportunities = [];
      })
    );
  }

  // Valuation if we have financial data
  if ((intent.action === "value" || intent.action === "comprehensive") && intent.revenue && intent.sde) {
    const valuation = estimateValuation({
      annual_revenue: intent.revenue,
      sde: intent.sde,
      sector: intent.sector,
      has_contracts: intent.has_contracts,
    });
    report.valuation_estimate = valuation;

    // Structure the deal at mid valuation (always when we have financials)
    if (intent.action === "comprehensive" || intent.action === "value") {
      const dealStructure = structureDeal({
        purchase_price: valuation.mid,
        asset_value: valuation.mid * 0.4, // estimate 40% hard assets
        seller_age: 58, // assume mid-50s default
        seller_annual_income: intent.sde,
      });
      report.deal_structure = dealStructure;
    }
  }

  // Deal structure only
  if (intent.action === "structure" && !intent.sde) {
    const price = intent.max_price ?? 1_500_000;
    const dealStructure = structureDeal({
      purchase_price: price,
      asset_value: price * 0.4,
      seller_age: 58,
      seller_annual_income: price * 0.20,
    });
    report.deal_structure = dealStructure;
  }

  // Research comparables
  if (intent.action === "research" || intent.action === "comprehensive") {
    const revenueRange: [number, number] = intent.revenue
      ? [intent.revenue * 0.5, intent.revenue * 2]
      : [500_000, 5_000_000];

    tasks.push(
      researchComparables({
        sector: intent.sector,
        revenue_range: revenueRange,
        geography: intent.geography ?? undefined,
      }).then((comps) => {
        report.comparables = comps;
      }).catch(() => {
        report.comparables = [];
      })
    );
  }

  await Promise.all(tasks);

  report.summary = buildSummary(report, intent);
  return report;
}

function parseQuery(query: string): ParsedIntent {
  const q = query.toLowerCase();

  // Detect action intent
  let action: ParsedIntent["action"] = "comprehensive";
  if (q.includes("find") || q.includes("scout") || q.includes("show me") || q.includes("search")) {
    action = "scout";
  } else if (q.includes("worth") || q.includes("value") || q.includes("valuation") || q.includes("multiple")) {
    action = "value";
  } else if (q.includes("structure") || q.includes("finance") || q.includes("fund")) {
    action = "structure";
  } else if (q.includes("comparable") || q.includes("comp") || q.includes("deal") || q.includes("transaction")) {
    action = "research";
  }

  // Extract sector
  let sector = "general services";
  if (q.includes("hvac") || q.includes("heating") || q.includes("cooling") || q.includes("air condition")) sector = "hvac";
  else if (q.includes("plumb")) sector = "plumbing";
  else if (q.includes("electric")) sector = "electrical";
  else if (q.includes("pest") || q.includes("exterminat")) sector = "pest_control";
  else if (q.includes("landscape") || q.includes("lawn")) sector = "landscaping";
  else if (q.includes("roof")) sector = "roofing";
  else if (q.includes("clean") || q.includes("janitor")) sector = "cleaning";
  else if (q.includes("mechanical")) sector = "mechanical";

  // Extract keywords for scraping
  const keywords: string[] = [];
  const sectorWords = ["hvac", "plumbing", "electrical", "pest control", "landscaping", "roofing", "cleaning", "mechanical"];
  for (const sw of sectorWords) {
    if (q.includes(sw)) keywords.push(sw);
  }
  if (keywords.length === 0) keywords.push(sector);

  // Extract geography / zip codes
  const zip_codes: string[] = [];
  let geography: string | null = null;

  // Explicit zip codes
  const zipMatches = query.match(/\b\d{5}\b/g);
  if (zipMatches) zip_codes.push(...zipMatches);

  // Named Nevada locations
  for (const [city, zips] of Object.entries(NEVADA_ZIPS)) {
    if (q.includes(city)) {
      zip_codes.push(...zips.slice(0, 3)); // limit to 3 zips per city
      geography = city.charAt(0).toUpperCase() + city.slice(1) + ", NV";
    }
  }

  // State-level mentions
  if (q.includes("nevada") || q.includes(", nv")) {
    geography = geography ?? "Nevada";
    if (zip_codes.length === 0) zip_codes.push("89501", "89701", "89431");
  }

  // Extract price
  const priceMatch = query.match(/(?:under|below|less than|max)?\s*\$?([\d,.]+\s*[KMB]?)/i);
  let max_price: number | null = null;
  if (priceMatch) {
    const extracted = extractDollarAmount(priceMatch[1]);
    if (extracted && extracted > 10_000) max_price = extracted;
  }

  // Extract revenue/SDE
  const revenueMatch = query.match(/(?:revenue|sales)[^$]*\$?([\d,.]+\s*[KMB]?)/i);
  const revenue = revenueMatch ? extractDollarAmount(revenueMatch[1]) : null;

  const sdeMatch = query.match(/(?:sde|cash.?flow|earnings)[^$]*\$?([\d,.]+\s*[KMB]?)/i);
  const sde = sdeMatch ? extractDollarAmount(sdeMatch[1]) : null;

  // Contract detection
  const has_contracts = q.includes("contract") || q.includes("recurring") || q.includes("maintenance");

  // Year range for SBA data
  let year_range: [number, number] | null = null;
  const yearMatch = query.match(/(\d{4})\s*[-–]\s*(\d{4})/);
  if (yearMatch) {
    year_range = [parseInt(yearMatch[1]), parseInt(yearMatch[2])];
  }

  return {
    action,
    sector,
    zip_codes: [...new Set(zip_codes)],
    keywords,
    max_price,
    revenue,
    sde,
    has_contracts,
    geography,
    year_range,
  };
}

function extractDollarAmount(str: string): number | null {
  const cleaned = str.replace(/[$,\s]/g, "");
  const match = cleaned.match(/^([\d.]+)([KMB]?)$/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  const suffix = match[2].toUpperCase();
  if (suffix === "K") return value * 1_000;
  if (suffix === "M") return value * 1_000_000;
  if (suffix === "B") return value * 1_000_000_000;
  return value;
}

function buildSummary(report: IntelligenceReport, intent: ParsedIntent): string {
  const parts: string[] = [];
  const sector = intent.sector.toUpperCase();
  const geo = intent.geography ?? "specified area";

  parts.push(`## Deal Intelligence Report: ${sector} in ${geo}`);
  parts.push(`**Query**: "${report.query}"`);
  parts.push("");

  if (Array.isArray(report.listings) && report.listings.length > 0) {
    parts.push(`### Active Listings (${report.listings.length} found)`);
    parts.push(`Found ${report.listings.length} active listings for ${sector} businesses.`);
  }

  if (Array.isArray(report.sba_loan_opportunities) && report.sba_loan_opportunities.length > 0) {
    parts.push(`### Motivated Seller Pipeline (SBA Loans)`);
    parts.push(`Found ${report.sba_loan_opportunities.length} businesses with SBA 7(a) loans from 2013-2019 — these are prime acquisition targets as loans approach maturity.`);
  }

  if (report.valuation_estimate && typeof report.valuation_estimate === "object") {
    const v = report.valuation_estimate as { low: number; mid: number; high: number; sector_normalized: string };
    parts.push(`### Valuation Range`);
    parts.push(`**Low**: $${v.low?.toLocaleString()} | **Mid**: $${v.mid?.toLocaleString()} | **High**: $${v.high?.toLocaleString()}`);
  }

  if (report.deal_structure && typeof report.deal_structure === "object") {
    const d = report.deal_structure as {
      equity_required: number;
      sba_loan_amount: number;
      seller_note_amount: number;
      annual_debt_service: number;
      estimated_seller_tax_savings: number;
    };
    parts.push(`### Recommended Deal Structure`);
    parts.push(`- Equity required: $${d.equity_required?.toLocaleString()}`);
    parts.push(`- SBA 7(a) loan: $${d.sba_loan_amount?.toLocaleString()}`);
    parts.push(`- Seller note: $${d.seller_note_amount?.toLocaleString()}`);
    parts.push(`- Annual debt service: $${d.annual_debt_service?.toLocaleString()}`);
    parts.push(`- Seller tax savings (installment): ~$${d.estimated_seller_tax_savings?.toLocaleString()}`);
  }

  if (Array.isArray(report.comparables) && report.comparables.length > 0) {
    parts.push(`### Comparable Transactions`);
    parts.push(`Found ${report.comparables.length} comparable transactions.`);
    const firstComp = report.comparables[0] as { implied_multiple?: number; transaction_description?: string };
    if (firstComp?.implied_multiple) {
      parts.push(`Leading comp: ${firstComp.implied_multiple}x multiple — ${firstComp.transaction_description?.slice(0, 100)}`);
    }
  }

  return parts.join("\n");
}
