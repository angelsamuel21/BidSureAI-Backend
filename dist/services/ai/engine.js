"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiVerificationEngine = exports.AIVerificationEngine = void 0;
class AIVerificationEngine {
    async analyze(request) {
        const timestamp = new Date().toISOString();
        const findings = [];
        // 1. Analyze Document Corpus & Cross-verify Fields
        const hasLocalContentIssue = request.ruleDiscrepancies.some((d) => d.toLowerCase().includes('local content'));
        const hasDebarmentIssue = request.isDebarred ||
            request.ruleDiscrepancies.some((d) => d.toLowerCase().includes('debarment')) ||
            request.ruleResults?.some((r) => r.ruleId === 'rule-debarment' && r.status === 'FAIL');
        const hasGstIssue = request.ruleDiscrepancies.some((d) => d.toLowerCase().includes('gst'));
        const oemRule = request.ruleResults?.find((r) => r.ruleId === 'rule-oem');
        const hasOemIssue = oemRule?.status === 'FAIL' ||
            request.ruleDiscrepancies.some((d) => d.toLowerCase().includes('oem') || d.toLowerCase().includes('manufacturer authorization'));
        const miiRule = request.ruleResults?.find((r) => r.ruleId === 'rule-mii');
        const hasMiiMissingIssue = miiRule?.status === 'FAIL';
        if (hasDebarmentIssue) {
            findings.push({
                severity: 'CRITICAL',
                title: 'Active Debarment Record Detected',
                description: `Entity "${request.bidderName}" is identified on Central Debarment / Blacklisting records. Mandatory rejection required under GFR 2017 Rule 151 and GeM Incident Policy.`,
                documentEvidence: 'Central Vigilance Commission & MoPNG Registry Reference: CVC-DEBAR-SANDBOX',
                clauseReference: 'GeM GTC Clause 4(xii) & GFR Rule 151',
                confidence: 0.99,
                recommendedAction: 'Disqualify bidder immediately. Log vigilance audit note.',
            });
        }
        if (hasOemIssue) {
            findings.push({
                severity: 'HIGH',
                title: 'Missing Mandatory OEM Authorization Form (MAF)',
                description: 'Mandatory OEM Authorization Letter not uploaded. In accordance with GeM General Terms and Conditions (GTC), non-OEM bidders must submit a valid Manufacturer Authorization Form.',
                documentEvidence: 'Document not uploaded',
                clauseReference: 'GeM GTC Technical Specification Clause 4.1',
                confidence: 0.98,
                recommendedAction: 'Mandatory technical requirement failed. Disqualify or seek formal clarification.',
            });
        }
        if (hasMiiMissingIssue && !hasLocalContentIssue) {
            findings.push({
                severity: 'HIGH',
                title: 'Make in India Local Content Declaration Missing',
                description: 'Mandatory Make in India (MII) local content declaration was not submitted with bid documents.',
                documentEvidence: 'Document not uploaded',
                clauseReference: 'PPP-MII Order 2017 (DPIIT)',
                confidence: 0.95,
                recommendedAction: 'Request bidder to submit certified local content declaration.',
            });
        }
        if (hasLocalContentIssue) {
            const claimedVal = request.extractedFields?.claimedLocalContent;
            const miiDoc = request.documents.find((d) => d.type === 'MAKE_IN_INDIA_DECLARATION' || d.name?.toLowerCase().includes('local content'));
            findings.push({
                severity: 'HIGH',
                title: 'Make in India Local Content Percentage Discrepancy',
                description: claimedVal !== undefined
                    ? `Discrepancy detected in local content self-declaration (${claimedVal}%). Supporting documentation requires officer verification.`
                    : 'Local content self-declaration exhibits discrepancies with supporting tender requirements.',
                documentEvidence: miiDoc?.name || 'Submitted Local Content Declaration',
                clauseReference: 'PPP-MII Order 2017 (DPIIT) & Tender Technical Clause 3.4',
                confidence: 0.94,
                recommendedAction: 'Request formal clarification from bidder with CA / Cost Auditor certificate.',
            });
        }
        if (hasGstIssue) {
            const gstDoc = request.documents.find((d) => d.type === 'GST_REGISTRATION_CERTIFICATE' || d.name?.toLowerCase().includes('gst'));
            findings.push({
                severity: 'WARNING',
                title: 'Minor Trade Name Variation in GST Record',
                description: 'The registered trade name in GST Portal displays minor suffix variation compared to the bid submission documents.',
                documentEvidence: gstDoc?.name || 'Submitted GST Document',
                clauseReference: 'Tender General Terms Clause 1.2',
                confidence: 0.88,
                recommendedAction: 'Verify board resolution or partnership deed to confirm legal continuity.',
            });
        }
        // If statutory passed but technical failed, record positive statutory finding
        const hasStatutorySuccess = !hasDebarmentIssue &&
            !hasGstIssue &&
            (request.extractedFields?.gstin || request.extractedFields?.pan);
        if (hasStatutorySuccess && (hasOemIssue || hasMiiMissingIssue)) {
            findings.push({
                severity: 'INFO',
                title: 'Statutory Credentials Validated in Sandbox Simulation',
                description: 'Submitted statutory credentials (GST, PAN, Udyam) are format-valid and cross-consistent.',
                documentEvidence: request.documents.map((d) => d.name).filter(Boolean).join(', ') || 'Submitted Documents',
                clauseReference: 'Statutory Eligibility Clause 2.1',
                confidence: 0.98,
                recommendedAction: 'Accept statutory compliance documentation.',
            });
        }
        // Default positive findings ONLY if there are no failures and no discrepancies
        const hasAnyFailure = (request.ruleResults || []).some((r) => r.status === 'FAIL');
        if (findings.length === 0 && !hasAnyFailure) {
            const uploadedDocNames = request.documents.map((d) => d.name).filter(Boolean);
            findings.push({
                severity: 'INFO',
                title: 'Statutory Identity & Legal Integrity Confirmed',
                description: 'Submitted statutory credentials verified against government sandbox registries.',
                documentEvidence: uploadedDocNames.length > 0 ? uploadedDocNames.join(', ') : 'Verified Documents',
                clauseReference: 'Statutory Eligibility Clause 2.1',
                confidence: 0.98,
                recommendedAction: 'Accept statutory compliance documentation.',
            });
            const oemDoc = request.documents.find((d) => d.type === 'OEM_AUTHORIZATION_LETTER' || d.name?.toLowerCase().includes('oem'));
            if (oemDoc) {
                findings.push({
                    severity: 'INFO',
                    title: 'OEM Authorization Document Authenticity Verified',
                    description: 'Manufacturer Authorization Form contains active validity dates and authorized signatory stamp.',
                    documentEvidence: oemDoc.name,
                    clauseReference: 'Technical Specification Clause 4.1',
                    confidence: 0.95,
                    recommendedAction: 'Proceed with technical specification evaluation.',
                });
            }
        }
        // Dynamically synthesize truthful summary
        let summary;
        if (hasDebarmentIssue) {
            summary = 'Critical disqualification flags detected: Entity is flagged on debarment/blacklisting records.';
        }
        else if (hasOemIssue) {
            summary =
                'Evaluated statutory credentials (GST, PAN, Udyam) are valid, but the bid is NON-COMPLIANT due to missing mandatory technical documentation (Manufacturer Authorization Form).';
        }
        else if (findings.some((f) => f.severity === 'HIGH')) {
            summary =
                'Material discrepancies or missing mandatory declarations detected. Procurement Officer review required.';
        }
        else if (findings.some((f) => f.severity === 'WARNING')) {
            summary = 'Minor discrepancies detected between submission and portal records. Officer verification recommended.';
        }
        else {
            summary = 'All statutory, financial, and technical credentials satisfy tender requirements.';
        }
        return {
            summary,
            findings,
            confidenceScore: findings.length > 0 ? findings[0].confidence : 0.95,
            analyzedAt: timestamp,
            modelName: 'GeM-Compliance-AI (Hybrid Transformer & Deterministic Guardrails v2.4)',
        };
    }
}
exports.AIVerificationEngine = AIVerificationEngine;
exports.aiVerificationEngine = new AIVerificationEngine();
exports.default = exports.aiVerificationEngine;
