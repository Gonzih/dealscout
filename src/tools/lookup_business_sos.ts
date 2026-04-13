/**
 * lookup_business_sos — Nevada (and other state) Secretary of State business lookup.
 *
 * Use this tool when you need to verify a business entity, check its status,
 * find registered agents, officers, or confirm formation details:
 *   "Look up ABC Plumbing LLC in Nevada SOS"
 *   "Who is the registered agent for XYZ HVAC Inc?"
 * --
 * Returns entity details including status, officers, and registered agent.
 */

import { fetchWithRetry, stripHtml } from "../utils/fetch.js";

export interface SosRecord {
  entity_name: string;
  status: string;
  registered_agent: string;
  officers: string[];
  formation_date: string;
  entity_type: string;
  entity_number: string;
}

export interface LookupSosParams {
  business_name: string;
  state?: string;
}

export async function lookupBusinessSos(params: LookupSosParams): Promise<SosRecord[]> {
  const { business_name, state = "NV" } = params;

  if (state === "NV" || state === "Nevada") {
    return lookupNevadaSos(business_name);
  }

  // Generic fallback using Jina-proxied search
  return lookupGenericSos(business_name, state);
}

async function lookupNevadaSos(businessName: string): Promise<SosRecord[]> {
  // Nevada SOS uses a searchable interface at esos.nv.gov
  // We'll use the Jina proxy to scrape the search results page
  const encodedName = encodeURIComponent(businessName);
  const searchUrl = `https://esos.nv.gov/EntitySearch/OnlineEntitySearch?searchValue=${encodedName}&searchType=1`;

  const html = await fetchWithRetry(searchUrl, {
    useJinaProxy: true,
    maxRetries: 3,
  });

  return parseNevadaSosResults(html, businessName);
}

function parseNevadaSosResults(html: string, searchTerm: string): SosRecord[] {
  const results: SosRecord[] = [];

  // Try to find entity rows in the search results table
  // Nevada SOS uses a data table with entity information
  const rows = html.split(/\n/).filter(line =>
    line.toLowerCase().includes("entity") ||
    line.toLowerCase().includes("status") ||
    line.toLowerCase().includes(searchTerm.toLowerCase().split(" ")[0])
  );

  // Pattern: look for table rows or structured data
  const entityPattern = /(?:entity\s*(?:name|id|number)?)[:\s]+([^\n|]+)/gi;
  const statusPattern = /(?:status)[:\s]+([^\n|,]+)/gi;
  const typePattern = /(?:type|entity\s*type)[:\s]+([^\n|,]+)/gi;
  const agentPattern = /(?:registered\s*agent)[:\s]+([^\n|,]+)/gi;
  const datePattern = /(?:formed|formation|filed|date)[:\s]+(\d{1,2}\/\d{1,2}\/\d{2,4})/gi;

  // Extract names from Jina-rendered markdown
  const nameMatches = [...html.matchAll(/\*\*([^*]+)\*\*|Entity Name[:\s]+([^\n]+)/gi)];
  const statusMatches = [...html.matchAll(statusPattern)];
  const typeMatches = [...html.matchAll(typePattern)];
  const agentMatches = [...html.matchAll(agentPattern)];
  const dateMatches = [...html.matchAll(datePattern)];

  // Build records from what we find
  if (nameMatches.length > 0 || rows.length > 0) {
    // Try to reconstruct structured data
    const entityNames: string[] = [];
    for (const m of nameMatches) {
      const name = (m[1] || m[2] || "").trim();
      if (name && name.toLowerCase().includes(searchTerm.toLowerCase().split(" ")[0].toLowerCase())) {
        entityNames.push(name);
      }
    }

    // Fallback: extract entity numbers (NV format: CXXXXXXXXX or EXXXXXXXXX)
    const entityNumbers = [...html.matchAll(/\b([CE]\d{7,10})\b/g)].map(m => m[1]);

    const count = Math.max(entityNames.length, 1);
    for (let i = 0; i < Math.min(count, 5); i++) {
      results.push({
        entity_name: entityNames[i] ?? searchTerm,
        status: stripHtml(statusMatches[i]?.[1] ?? "Unknown").trim(),
        registered_agent: stripHtml(agentMatches[i]?.[1] ?? "Not found").trim(),
        officers: extractOfficers(html),
        formation_date: stripHtml(dateMatches[i]?.[1] ?? "Unknown").trim(),
        entity_type: stripHtml(typeMatches[i]?.[1] ?? "Unknown").trim(),
        entity_number: entityNumbers[i] ?? "Unknown",
      });
    }
  }

  // If nothing found, return a placeholder indicating the search was performed
  if (results.length === 0) {
    results.push({
      entity_name: searchTerm,
      status: "Not found in search results",
      registered_agent: "N/A",
      officers: [],
      formation_date: "N/A",
      entity_type: "N/A",
      entity_number: "N/A",
    });
  }

  return results;
}

function extractOfficers(html: string): string[] {
  const officers: string[] = [];
  const officerPattern = /(?:officer|director|manager|president|member)[:\s]+([A-Z][a-zA-Z\s,]+)/gi;
  const matches = [...html.matchAll(officerPattern)];
  for (const m of matches.slice(0, 5)) {
    const name = stripHtml(m[1]).trim();
    if (name && name.length > 2 && name.length < 80) {
      officers.push(name);
    }
  }
  return [...new Set(officers)];
}

async function lookupGenericSos(businessName: string, state: string): Promise<SosRecord[]> {
  // Generic SOS lookup via Jina proxy on state SOS website
  const stateAbbr = state.toUpperCase();
  const sosUrls: Record<string, string> = {
    CA: `https://bizfileonline.sos.ca.gov/search/business`,
    TX: `https://mycpa.cpa.state.tx.us/coa/Index.html`,
    FL: `https://search.sunbiz.org/Inquiry/CorporationSearch/SearchResults`,
    AZ: `https://ecorp.azcc.gov/BusinessSearch/BusinessSearch`,
    CO: `https://www.sos.state.co.us/biz/BusinessEntityCriteriaExt.do`,
  };

  const url = sosUrls[stateAbbr];
  if (!url) {
    return [{
      entity_name: businessName,
      status: `SOS lookup not supported for state: ${state}`,
      registered_agent: "N/A",
      officers: [],
      formation_date: "N/A",
      entity_type: "N/A",
      entity_number: "N/A",
    }];
  }

  const html = await fetchWithRetry(
    `${url}?searchTerm=${encodeURIComponent(businessName)}`,
    { useJinaProxy: true, maxRetries: 2 }
  );

  return parseNevadaSosResults(html, businessName);
}
