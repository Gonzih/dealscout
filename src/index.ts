#!/usr/bin/env node
/**
 * @gonzih/dealscout — Private Equity Intelligence MCP Server
 *
 * Tools for scouting small business acquisition targets ($500K–$5M revenue)
 * in HVAC, plumbing, electrical, and mechanical services.
 *
 * Primary target: Nevada (Lyon County, Carson City, Reno corridor)
 *
 * Usage:
 *   npx @gonzih/dealscout
 *
 * Or in Claude Desktop config:
 *   { "command": "npx", "args": ["-y", "@gonzih/dealscout"] }
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

import { scoutListings } from "./tools/scout_listings.js";
import { lookupBusinessSos } from "./tools/lookup_business_sos.js";
import { getSbaLoanData } from "./tools/get_sba_loan_data.js";
import { estimateValuation } from "./tools/estimate_valuation.js";
import { structureDeal } from "./tools/structure_deal.js";
import { researchComparables } from "./tools/research_comparables.js";
import { intelligentScout } from "./tools/intelligent_scout.js";

const server = new McpServer({
  name: "dealscout",
  version: "1.0.0",
});

// ── Tool: scout_listings ───────────────────────────────────────────────────

server.tool(
  "scout_listings",
  `Scrape BizBuySell and BizQuest for active business-for-sale listings.
Use when: finding acquisition targets by zip code and sector keyword.
-- Returns: array of {name, asking_price, revenue, cash_flow, location, listing_url, days_on_market}`,
  {
    zip_codes: z.array(z.string()).describe("ZIP codes to search (e.g. ['89501', '89701'])"),
    keywords: z.array(z.string()).describe("Business type keywords (e.g. ['HVAC', 'plumbing'])"),
    max_asking_price: z.number().optional().describe("Maximum asking price filter in dollars"),
  },
  async (params) => {
    try {
      const listings = await scoutListings(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(listings, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err), listings: [] }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: lookup_business_sos ──────────────────────────────────────────────

server.tool(
  "lookup_business_sos",
  `Look up a business entity in the Secretary of State database.
Use when: verifying business legitimacy, finding owners/officers, checking entity status.
Default state: Nevada (esos.nv.gov). Supports CA, TX, FL, AZ, CO as fallbacks.
-- Returns: {entity_name, status, registered_agent, officers, formation_date, entity_type}`,
  {
    business_name: z.string().describe("Business name to search (partial matches supported)"),
    state: z.string().optional().describe("State abbreviation (default: NV)"),
  },
  async (params) => {
    try {
      const records = await lookupBusinessSos(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(records, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err), records: [] }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: get_sba_loan_data ────────────────────────────────────────────────

server.tool(
  "get_sba_loan_data",
  `Query public SBA 7(a) loan FOIA data by zip code and NAICS code.
Use when: identifying motivated sellers (businesses with maturing SBA loans),
understanding lending patterns, or finding businesses that have expanded via SBA debt.
Key insight: 7(a) loans from 2013-2019 are maturing now → owner fatigue → acquisition opportunity.
-- Returns: array of {borrower_name, loan_amount, approval_date, naics, city, state, term_months}`,
  {
    zip_code: z.string().describe("ZIP code to search"),
    naics_code: z.string().optional().describe("NAICS industry code (e.g. '238220' for plumbing/HVAC)"),
    year_range: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe("Approval year range [start, end] (e.g. [2015, 2019])"),
  },
  async (params) => {
    try {
      const loans = await getSbaLoanData(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(loans, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err), loans: [] }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: estimate_valuation ───────────────────────────────────────────────

server.tool(
  "estimate_valuation",
  `Calculate acquisition valuation range using sector-specific SDE multiples.
Use when: you have revenue and SDE figures and need to know what a business is worth.
SDE = Seller Discretionary Earnings = net income + owner salary + add-backs.
Sectors: hvac, plumbing, electrical, pest_control, landscaping, roofing, cleaning, mechanical, general.
-- Returns: {low, mid, high, low_multiple, high_multiple, sector_normalized, notes}`,
  {
    annual_revenue: z.number().describe("Annual revenue in dollars"),
    sde: z.number().describe("Seller Discretionary Earnings (SDE) in dollars"),
    sector: z.string().describe("Business sector (e.g. 'HVAC', 'plumbing', 'pest control')"),
    has_contracts: z
      .boolean()
      .describe("Whether business has recurring maintenance/service contracts"),
  },
  async (params) => {
    try {
      const result = estimateValuation(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err) }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: structure_deal ───────────────────────────────────────────────────

server.tool(
  "structure_deal",
  `Model tax-efficient acquisition structures with SBA 7(a) financing and seller notes.
Use when: you have a deal in mind and want to model equity requirements, debt service,
and seller tax savings from installment sale treatment.
Key insight: seller notes create installment sale treatment → seller saves on capital gains tax.
Asset purchase always recommended over stock purchase for stepped-up basis depreciation.
-- Returns: {recommended_structure, equity_required, sba_loan_amount, seller_note_amount, annual_debt_service, estimated_seller_tax_savings, annual_depreciation_shield, estimated_dscr}`,
  {
    purchase_price: z.number().describe("Total acquisition price in dollars"),
    asset_value: z
      .number()
      .describe("Tangible asset value (equipment, vehicles, inventory) in dollars"),
    seller_age: z.number().describe("Seller's age (affects installment sale optimization)"),
    seller_annual_income: z
      .number()
      .describe("Seller's current annual income/SDE in dollars"),
  },
  async (params) => {
    try {
      const result = structureDeal(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err) }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: research_comparables ─────────────────────────────────────────────

server.tool(
  "research_comparables",
  `Find recent comparable small business PE transactions and implied multiples.
Use when: validating a valuation, understanding market multiples, or preparing an offer.
Sources: Axial forum deal flow, BizBuySell sold listings, curated industry benchmarks.
-- Returns: array of {transaction_description, implied_multiple, date, revenue_range, geography, notes}`,
  {
    sector: z.string().describe("Business sector (e.g. 'HVAC', 'pest control')"),
    revenue_range: z
      .tuple([z.number(), z.number()])
      .describe("Revenue range [min, max] in dollars (e.g. [500000, 3000000])"),
    geography: z
      .string()
      .optional()
      .describe("Geographic filter (e.g. 'Nevada', 'Southwest', 'Reno NV')"),
  },
  async (params) => {
    try {
      const comps = await researchComparables(params);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(comps, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err), comps: [] }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Tool: intelligent_scout ────────────────────────────────────────────────

server.tool(
  "intelligent_scout",
  `Natural language deal intelligence orchestrator — START HERE for most queries.
Parses your intent and coordinates scout_listings, get_sba_loan_data, estimate_valuation,
structure_deal, and research_comparables automatically, then synthesizes a report.
Examples:
  "Find HVAC businesses for sale within 50 miles of Reno under $2M"
  "What's a plumbing company with $1.2M revenue and $300K SDE worth in Nevada?"
  "Show me motivated sellers (SBA loans 2015-2018) near Carson City"
  "Structure a $1.5M HVAC acquisition — seller is 63"
-- Returns: full intelligence report with listings, SBA data, valuation, deal structure, and comps`,
  {
    query: z
      .string()
      .describe("Natural language deal intelligence query"),
  },
  async ({ query }) => {
    try {
      const report = await intelligentScout(query);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(report, null, 2),
          },
        ],
      };
    } catch (err) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: String(err), query }),
          },
        ],
        isError: true,
      };
    }
  }
);

// ── Start Server ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Server runs until stdin closes
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
