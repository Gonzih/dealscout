# @gonzih/dealscout

Private equity intelligence MCP server for small business acquisition scouting.

Built for AI-native PE operators targeting HVAC, plumbing, electrical, and mechanical services businesses ($500K–$5M revenue) in Nevada and nationally.

## Installation

```bash
npx @gonzih/dealscout
```

Or add to your Claude Desktop / MCP client config:

```json
{
  "mcpServers": {
    "dealscout": {
      "command": "npx",
      "args": ["-y", "@gonzih/dealscout"]
    }
  }
}
```

## Tools

### `intelligent_scout` (start here)

Natural language orchestrator. Parses intent and runs the right tools automatically.

```
"Find HVAC businesses for sale within 50 miles of Reno under $2M"
"What's a plumbing company with $1.2M revenue and $300K SDE worth in Nevada?"
"Show me motivated sellers with SBA loans from 2015-2018 near Carson City"
"Structure a $1.5M HVAC acquisition — seller is 63 years old"
```

### `scout_listings`

Scrape BizBuySell and BizQuest for active business-for-sale listings.

```json
{
  "zip_codes": ["89501", "89701"],
  "keywords": ["HVAC", "plumbing"],
  "max_asking_price": 2000000
}
```

### `lookup_business_sos`

Secretary of State business entity lookup (Nevada default, +5 states).

```json
{
  "business_name": "ABC Plumbing LLC",
  "state": "NV"
}
```

### `get_sba_loan_data`

Query public SBA 7(a) FOIA loan data. Businesses with maturing loans (approved 2013–2019) are motivated sellers.

```json
{
  "zip_code": "89501",
  "naics_code": "238220",
  "year_range": [2014, 2018]
}
```

### `estimate_valuation`

Calculate acquisition valuation range using sector SDE multiples.

| Sector | Multiple Range |
|--------|---------------|
| HVAC / Mechanical | 3–5x SDE |
| Plumbing / Electrical | 2.5–4x SDE |
| Pest Control | 4–7x SDE |
| Landscaping | 2–3x SDE |
| Cleaning / Janitorial | 2–3.5x SDE |

```json
{
  "annual_revenue": 1500000,
  "sde": 350000,
  "sector": "HVAC",
  "has_contracts": true
}
```

### `structure_deal`

Tax-efficient deal structure calculator: SBA 7(a) + seller note + installment sale analysis.

```json
{
  "purchase_price": 1500000,
  "asset_value": 600000,
  "seller_age": 62,
  "seller_annual_income": 280000
}
```

Returns equity required, SBA loan sizing, seller note amount, annual debt service, DSCR estimate, and seller's installment sale tax savings.

### `research_comparables`

Find recent comparable transactions and implied multiples from Axial and BizBuySell sold listings.

```json
{
  "sector": "pest control",
  "revenue_range": [500000, 3000000],
  "geography": "Nevada"
}
```

## Target Geography

Primary: Nevada — Lyon County, Carson City, Reno corridor  
Expanding: National roll-up in home services

## The Edge

Traditional PE misses sub-$5M deals. The opportunity:
- **Tax optimization**: Installment sale + asset purchase depreciation shield saves $50K–$200K/deal
- **AI-native ops**: Route optimization, dynamic pricing, automated dispatch
- **SBA leverage**: 90% LTV at 10.5% — minimal equity required
- **Motivated sellers**: SBA loan maturities + owner fatigue = below-market pricing

## Development

```bash
npm install
npm run build
npm run dev  # runs server directly
```

## License

MIT
