# PLAN: @gonzih/dealscout MCP Server

## Task Restatement
Build and publish a TypeScript MCP (Model Context Protocol) server for private equity deal intelligence, targeting small business acquisitions ($500k-$5M) in HVAC/plumbing/electrical/mechanical services, primarily Nevada.

## Approaches Considered

### Approach 1: Monolithic index.ts with all tools inline
- All 7 tools in a single file
- Simple, easy to read
- Gets unwieldy past ~800 lines
- No separation of concerns

### Approach 2: Modular tools directory (CHOSEN)
- `src/index.ts` — server setup and tool registration
- `src/tools/` — one file per tool
- `src/utils/` — shared helpers (fetch, retry, parsing)
- Cleaner, testable, maintainable
- Slight overhead in file count

### Approach 3: Plugin-style dynamic tool loading
- Over-engineered for 7 tools
- Adds complexity with no benefit

## Chosen Approach: Modular (Approach 2)
- Clean separation makes each tool independently readable
- Shared utils prevent code duplication across scraping tools
- Standard MCP SDK pattern

## Files to Touch
- `package.json`
- `tsconfig.json`
- `src/index.ts` — server entry point
- `src/tools/scout_listings.ts`
- `src/tools/lookup_business_sos.ts`
- `src/tools/get_sba_loan_data.ts`
- `src/tools/estimate_valuation.ts`
- `src/tools/structure_deal.ts`
- `src/tools/research_comparables.ts`
- `src/tools/intelligent_scout.ts`
- `src/utils/fetch.ts` — retry-aware fetch with rate limit handling
- `README.md`

## Risks & Unknowns
- BizBuySell may block scraping — use r.jina.ai proxy as fallback
- Nevada SOS has form-based search (may require query params reconstruction)
- SBA data.sba.gov API resource IDs may change — verify at build time
- Axial.net scraping may be gated — use r.jina.ai
- npm publish requires `@gonzih` org access — assumed available
- Cheerio adds weight; use regex-based parsing where possible to keep deps lean
