"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DebarmentAdapter = void 0;
class DebarmentAdapter {
    portalName = 'DEBARMENT';
    async verify(bidderNameOrPan) {
        const term = (bidderNameOrPan || '').trim().toUpperCase();
        const referenceId = `CVC-DEBAR-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date().toISOString();
        // Central Debarment / Blacklisting Sandbox Registry (MoPNG, CPCL, GeM, CVC, World Bank)
        const debarredEntities = {
            'PQR TECHNOLOGIES': {
                debarmentAgency: 'Central Vigilance Commission (CVC) / MoPNG Blacklist',
                debarredFrom: '2025-10-01',
                debarredUntil: '2027-09-30',
                reason: 'Active debarment detected: Submitting non-compliant technical documents.',
            },
            'AAAAA0000A': {
                debarmentAgency: 'Central Vigilance Commission (CVC) / MoPNG Blacklist',
                debarredFrom: '2025-10-01',
                debarredUntil: '2027-09-30',
                reason: 'Active debarment detected: Submitting non-compliant technical documents.',
            },
            'SHAKTI ENTERPRISES': {
                debarmentAgency: 'Central Vigilance Commission (CVC) Debarment Circular',
                debarredFrom: '2026-01-15',
                debarredUntil: '2027-01-14',
                reason: 'Corrupt practice and failure to execute delivery commitments under GeM Contract GEMC-51168.',
            },
        };
        // Check matches
        let hit = null;
        for (const [key, val] of Object.entries(debarredEntities)) {
            if (term.includes(key) || key.includes(term)) {
                hit = val;
                break;
            }
        }
        if (hit) {
            return {
                portal: 'DEBARMENT',
                identifier: term,
                status: 'FAILED',
                source: 'Internal Debarment Registry (Sandbox Simulation)',
                checkedAt: timestamp,
                referenceId,
                isSandbox: true,
                verificationMethod: 'FAILED',
                data: {
                    isDebarred: true,
                    ...hit,
                },
                rawSummary: `CRITICAL DEBARMENT HIT: Entity "${term}" is flagged on Internal Debarment Registry by ${hit.debarmentAgency} until ${hit.debarredUntil}. Reason: ${hit.reason}.`,
            };
        }
        return {
            portal: 'DEBARMENT',
            identifier: term,
            status: 'VERIFIED',
            source: 'Internal Debarment Registry (Sandbox Simulation)',
            checkedAt: timestamp,
            referenceId,
            isSandbox: true,
            verificationMethod: 'SANDBOX_VERIFIED',
            data: {
                isDebarred: false,
                activeSanctions: 0,
                scrutinyClearingDate: timestamp,
            },
            rawSummary: `No active debarment or blacklisting orders found for "${term}" in Internal Debarment Registry (External government live API unavailable).`,
        };
    }
}
exports.DebarmentAdapter = DebarmentAdapter;
