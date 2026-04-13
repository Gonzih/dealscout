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
  // Financing components
  equity_required: number;
  sba_loan_amount: number;
  seller_note_amount: number;
  // Debt service
  annual_debt_service: number;
  monthly_debt_service: number;
  // Tax analysis
  estimated_seller_tax_savings: number;
  seller_effective_tax_rate_installment: number;
  seller_effective_tax_rate_lump_sum: number;
  // Asset vs stock
  recommended_purchase_type: "asset" | "stock";
  annual_depreciation_shield: number;
  // Returns
  estimated_dscr: number;
  notes: string;
}

export interface StructureDealParams {
  purchase_price: number;
  asset_value: number;
  seller_age: number;
  seller_annual_income: number;
}

// 2024 SBA 7(a) parameters
const SBA_MAX_LOAN = 5_000_000;
const SBA_COVERAGE_PCT = 0.9; // SBA can cover up to 90% of acquisition price
const SBA_INTEREST_RATE = 0.105; // ~Prime + 2.75% as of 2024
const SBA_TERM_YEARS = 10; // standard for business acquisition

// Seller note parameters
const SELLER_NOTE_MIN_PCT = 0.10;
const SELLER_NOTE_MAX_PCT = 0.50;
const SELLER_NOTE_RATE = 0.07; // 6–8% typical, use 7% as mid
const SELLER_NOTE_TERM_YEARS = 5;

// Capital gains tax (federal long-term + net investment income tax)
const FEDERAL_LTCG_RATE = 0.20;
const NIIT_RATE = 0.038;
const COMBINED_LTCG_RATE = FEDERAL_LTCG_RATE + NIIT_RATE; // 23.8%

// State-level depreciation: 15-year MACRS for most small business assets
const MACRS_15_YEAR_RATE = 1 / 15;
// Bonus depreciation (80% in 2023, phasing down)
const BONUS_DEPRECIATION_PCT = 0.6; // 60% in 2024

export function structureDeal(params: StructureDealParams): DealStructureResult {
  const { purchase_price, asset_value, seller_age, seller_annual_income } = params;

  // ── SBA Loan Sizing ──────────────────────────────────────────────────────
  const maxSbaLoan = Math.min(purchase_price * SBA_COVERAGE_PCT, SBA_MAX_LOAN);
  // SBA requires equity injection (typically 10%)
  const minEquity = purchase_price * 0.10;

  // ── Seller Note Sizing ───────────────────────────────────────────────────
  // Optimal seller note: enough to provide installment sale benefit, not too much
  // Rule of thumb: 20–30% seller note + 60–70% SBA + 10% equity
  const sellerNotePct = seller_age >= 60 ? 0.30 : 0.20; // older sellers benefit more from installment
  const sellerNoteAmount = Math.round(purchase_price * sellerNotePct);
  const sbaLoanAmount = Math.round(Math.min(
    purchase_price - minEquity - sellerNoteAmount,
    maxSbaLoan
  ));
  const equityRequired = Math.max(purchase_price - sbaLoanAmount - sellerNoteAmount, minEquity);

  // ── Debt Service ─────────────────────────────────────────────────────────
  const sbaMonthlyPayment = calcMonthlyPayment(sbaLoanAmount, SBA_INTEREST_RATE, SBA_TERM_YEARS * 12);
  const sellerNoteMonthlyPayment = calcMonthlyPayment(sellerNoteAmount, SELLER_NOTE_RATE, SELLER_NOTE_TERM_YEARS * 12);
  const monthlyDebtService = sbaMonthlyPayment + sellerNoteMonthlyPayment;
  const annualDebtService = monthlyDebtService * 12;

  // ── Installment Sale Tax Analysis ────────────────────────────────────────
  // Assume seller's basis is ~20% of purchase price (typical for long-held business)
  const estimatedBasis = purchase_price * 0.20;
  const capitalGain = purchase_price - estimatedBasis;

  // Lump-sum tax (all gain recognized in year of sale)
  const lumpSumTax = capitalGain * COMBINED_LTCG_RATE;

  // Installment sale: gain spread over note term + balance at close
  const installmentPortion = sellerNoteAmount / purchase_price;
  const upfrontPortion = 1 - installmentPortion;
  const upfrontGain = capitalGain * upfrontPortion;
  const installmentGain = capitalGain * installmentPortion;

  // Installment sale tax — upfront portion taxed now, installment over note term
  // Benefit: avoids pushing seller into higher bracket in year of sale
  const installmentTaxNPV = upfrontGain * COMBINED_LTCG_RATE +
    installmentGain * COMBINED_LTCG_RATE * 0.85; // ~15% discount for time value
  const estimatedSellerTaxSavings = Math.max(0, Math.round(lumpSumTax - installmentTaxNPV));

  const sellerEffectiveLumpSum = (lumpSumTax / capitalGain) * 100;
  const sellerEffectiveInstallment = (installmentTaxNPV / capitalGain) * 100;

  // ── Asset vs Stock Purchase ──────────────────────────────────────────────
  // Asset purchase: buyer gets stepped-up basis → depreciation shield
  // Stock purchase: buyer takes over existing basis (worse for buyer, better for seller)
  // For most small business acquisitions under $5M: asset purchase is strongly preferred

  // Bonus depreciation on qualifying assets (equipment, vehicles, etc.)
  // Assume 40% of asset value is bonus-depreciable personal property
  const bonusDepreciableAssets = asset_value * 0.40;
  const bonusDeduction = bonusDepreciableAssets * BONUS_DEPRECIATION_PCT;
  // Remaining assets amortized over 15 years
  const regularDepreciation = (asset_value - bonusDepreciableAssets) * MACRS_15_YEAR_RATE;
  // Goodwill amortized over 15 years (Section 197)
  const goodwill = purchase_price - asset_value;
  const goodwillAmortization = goodwill > 0 ? goodwill / 15 : 0;

  const annualDepreciationShield = Math.round(
    bonusDeduction + regularDepreciation + goodwillAmortization
  );

  // ── DSCR Estimate ────────────────────────────────────────────────────────
  // Assume SDE is ~25% of purchase price for a reasonably priced deal
  const estimatedSde = purchase_price * 0.25;
  const estimatedDscr = parseFloat((estimatedSde / annualDebtService).toFixed(2));

  // ── Recommended Structure ────────────────────────────────────────────────
  let structure = `SBA 7(a) + Seller Note (${Math.round(sellerNotePct * 100)}%)`;
  if (purchase_price > SBA_MAX_LOAN * 0.9) {
    structure = "Seller Note + Equity (SBA limit reached)";
  }

  const sellerAgeNote = seller_age >= 65
    ? "Seller is retirement-age — installment sale maximizes after-tax proceeds and may accelerate deal."
    : seller_age >= 55
    ? "Seller approaching retirement — installment sale timing aligns with typical exit horizon."
    : "Seller is mid-career — consider earnout to bridge valuation gap.";

  const dcscNote = estimatedDscr >= 1.25
    ? `Estimated DSCR of ${estimatedDscr}x is above 1.25x threshold — deal cash-flows positively.`
    : `Estimated DSCR of ${estimatedDscr}x is below 1.25x — negotiate lower price or larger seller note.`;

  return {
    recommended_structure: structure,
    purchase_price,
    equity_required: Math.round(equityRequired),
    sba_loan_amount: Math.round(sbaLoanAmount),
    seller_note_amount: Math.round(sellerNoteAmount),
    annual_debt_service: Math.round(annualDebtService),
    monthly_debt_service: Math.round(monthlyDebtService),
    estimated_seller_tax_savings: estimatedSellerTaxSavings,
    seller_effective_tax_rate_installment: parseFloat(sellerEffectiveInstallment.toFixed(1)),
    seller_effective_tax_rate_lump_sum: parseFloat(sellerEffectiveLumpSum.toFixed(1)),
    recommended_purchase_type: "asset",
    annual_depreciation_shield: annualDepreciationShield,
    estimated_dscr: estimatedDscr,
    notes: `Asset purchase strongly recommended for stepped-up basis and depreciation shield of ~$${annualDepreciationShield.toLocaleString()}/year. ${sellerAgeNote} ${dcscNote} Seller note of $${sellerNoteAmount.toLocaleString()} at ${(SELLER_NOTE_RATE * 100).toFixed(0)}% over ${SELLER_NOTE_TERM_YEARS} years saves seller ~$${estimatedSellerTaxSavings.toLocaleString()} in taxes via installment sale.`,
  };
}

function calcMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
  if (principal <= 0) return 0;
  const monthlyRate = annualRate / 12;
  if (monthlyRate === 0) return principal / termMonths;
  return (principal * monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
    (Math.pow(1 + monthlyRate, termMonths) - 1);
}
