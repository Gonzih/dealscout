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
export declare function lookupBusinessSos(params: LookupSosParams): Promise<SosRecord[]>;
//# sourceMappingURL=lookup_business_sos.d.ts.map