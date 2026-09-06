"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.featureGenerator = exports.FeatureGeneratorService = exports.CANONICAL_28_FEATURE_KEYS = void 0;
exports.CANONICAL_28_FEATURE_KEYS = [
    'gst_required',
    'pan_required',
    'udyam_required',
    'itr_required',
    'oem_required',
    'experience_required',
    'turnover_required',
    'make_in_india_required',
    'epfo_required',
    'esic_required',
    'startup_required',
    'nsic_required',
    'gst_status_encoded',
    'pan_status_encoded',
    'udyam_status_encoded',
    'itr_status_encoded',
    'oem_status_encoded',
    'experience_status_encoded',
    'turnover_status_encoded',
    'make_in_india_status_encoded',
    'epfo_status_encoded',
    'esic_status_encoded',
    'startup_status_encoded',
    'nsic_status_encoded',
    'blacklist_encoded',
    'document_completeness',
    'cross_validation_encoded',
    'critical_failures',
];
class FeatureGeneratorService {
    /**
     * Generates exactly 28 numeric features matching compliance_feature_columns.pkl
     */
    generateFeatures(input) {
        const reqs = input.tenderRequirements || [];
        const bidder = input.bidder || {};
        const docs = input.documents || [];
        const portals = input.portalRecords || {};
        const rules = input.ruleResults || [];
        const reqCodes = new Set(reqs.map((r) => (r.code || '').toUpperCase()));
        const reqNames = reqs.map((r) => (r.name || '').toLowerCase());
        const isReq = (code, ...keywords) => {
            if (reqCodes.has(code.toUpperCase()))
                return 1;
            for (const kw of keywords) {
                if (reqNames.some((n) => n.includes(kw.toLowerCase())))
                    return 1;
            }
            return 0;
        };
        // 1. Requirements flags (12 features)
        // In standard GeM/public tenders, GST, PAN, and MII are baseline mandatory
        const gst_required = isReq('STAT_GST', 'gst') || (reqs.length === 0 ? 1 : 1);
        const pan_required = isReq('STAT_PAN', 'pan') || (reqs.length === 0 ? 1 : 1);
        const udyam_required = isReq('STAT_UDYAM', 'udyam', 'msme');
        const itr_required = isReq('FIN_ITR', 'itr', 'income tax');
        const oem_required = isReq('TECH_OEM', 'oem', 'maf', 'manufacturer') || (reqs.length === 0 ? 1 : 0);
        const experience_required = isReq('TECH_EXP', 'experience');
        const turnover_required = isReq('FIN_TURNOVER', 'turnover');
        const make_in_india_required = isReq('TECH_MII', 'make in india', 'local content') || (reqs.length === 0 ? 1 : 1);
        const epfo_required = isReq('STAT_EPFO', 'epfo', 'provident');
        const esic_required = isReq('STAT_ESIC', 'esic');
        const startup_required = isReq('STAT_STARTUP', 'startup', 'dpiit');
        const nsic_required = isReq('STAT_NSIC', 'nsic');
        // Document types present
        const docTypes = new Set(docs.map((d) => (d.documentType || '').toUpperCase()));
        const hasDoc = (...types) => types.some((t) => docTypes.has(t.toUpperCase()));
        // Portal statuses
        const gstRecord = portals.gst;
        const panRecord = portals.pan;
        const udyamRecord = portals.udyam;
        const miiRecord = portals.mii;
        const debarmentRecord = portals.debarment;
        // 2. Status Encoded flags (12 features: 1 = Valid/Compliant/Exempt, 0 = Non-compliant/Missing)
        const gst_status_encoded = gstRecord?.status === 'VERIFIED' && gstRecord?.data?.status === 'Active'
            ? 1
            : hasDoc('GST_REGISTRATION_CERTIFICATE') && !gstRecord?.status?.includes('FAIL')
                ? 1
                : 0;
        const pan_status_encoded = panRecord?.status === 'VERIFIED'
            ? 1
            : hasDoc('PAN_CARD') && !panRecord?.status?.includes('FAIL')
                ? 1
                : 0;
        const isMsme = bidder.category === 'MICRO' || bidder.category === 'SMALL';
        const udyam_status_encoded = udyamRecord?.status === 'VERIFIED' || (!udyam_required && !bidder.udyamNumber)
            ? 1
            : hasDoc('UDYAM_MSME_CERTIFICATE')
                ? 1
                : 0;
        const itr_status_encoded = hasDoc('ITR') || panRecord?.data?.itrFilingStatus === 'COMPLIANT' || !itr_required
            ? 1
            : 0;
        const oemRule = rules.find((r) => r.ruleId === 'rule-oem');
        const oem_status_encoded = oemRule ? (oemRule.status === 'PASS' ? 1 : 0) : hasDoc('OEM_AUTHORIZATION_LETTER') || !oem_required ? 1 : 0;
        const experience_status_encoded = hasDoc('EXPERIENCE_CERTIFICATE') || (isMsme && turnover_required) || !experience_required ? 1 : 0;
        const turnover_status_encoded = hasDoc('TURNOVER_CERTIFICATE') || isMsme || !turnover_required ? 1 : 0;
        const miiRule = rules.find((r) => r.ruleId === 'rule-mii');
        const make_in_india_status_encoded = miiRule ? (miiRule.status === 'PASS' ? 1 : 0) : miiRecord && !miiRecord.data?.hasDiscrepancy ? 1 : 0;
        const epfo_status_encoded = hasDoc('EPFO_CERTIFICATE') || !epfo_required ? 1 : 0;
        const esic_status_encoded = hasDoc('ESIC_CERTIFICATE') || !esic_required ? 1 : 0;
        const startup_status_encoded = hasDoc('STARTUP_CERTIFICATE') || !startup_required ? 1 : 0;
        const nsic_status_encoded = hasDoc('NSIC_CERTIFICATE') || !nsic_required ? 1 : 0;
        // 3. Global & Risk Features (4 features)
        // Blacklist: 1 if debarred/blacklisted, 0 if clean
        const isDebarred = Boolean(bidder.isDebarred ||
            debarmentRecord?.status === 'FAILED' ||
            rules.some((r) => r.ruleId === 'rule-debarment' && r.status === 'FAIL'));
        const blacklist_encoded = isDebarred ? 1 : 0;
        // Document Completeness (ratio of required docs uploaded to total required, 0.0 - 1.0)
        const mandatoryReqs = reqs.filter((r) => r.mandatory && r.expectedDocumentType);
        const totalRequiredDocs = mandatoryReqs.length > 0 ? mandatoryReqs.length : 3;
        const matchingDocs = mandatoryReqs.length > 0
            ? mandatoryReqs.filter((r) => hasDoc(r.expectedDocumentType)).length
            : docs.length;
        const document_completeness = Math.min(1.0, Math.max(0.0, Number((matchingDocs / totalRequiredDocs).toFixed(2))));
        // Cross validation: check if PAN matches characters 3-12 of GSTIN
        let cross_validation_encoded = 1;
        if (bidder.gstin && bidder.pan && bidder.gstin.length >= 12) {
            const derivedPan = bidder.gstin.substring(2, 12).toUpperCase();
            if (derivedPan !== bidder.pan.toUpperCase()) {
                cross_validation_encoded = 0;
            }
        }
        if (miiRecord?.data?.hasDiscrepancy) {
            cross_validation_encoded = 0;
        }
        // Critical failures count
        let critical_failures = 0;
        if (isDebarred)
            critical_failures += 1;
        if (gst_required && gst_status_encoded === 0 && docs.length > 0)
            critical_failures += 1;
        if (rules.some((r) => r.mandatory && r.status === 'FAIL'))
            critical_failures += 1;
        const features = {
            gst_required,
            pan_required,
            udyam_required,
            itr_required,
            oem_required,
            experience_required,
            turnover_required,
            make_in_india_required,
            epfo_required,
            esic_required,
            startup_required,
            nsic_required,
            gst_status_encoded,
            pan_status_encoded,
            udyam_status_encoded,
            itr_status_encoded,
            oem_status_encoded,
            experience_status_encoded,
            turnover_status_encoded,
            make_in_india_status_encoded,
            epfo_status_encoded,
            esic_status_encoded,
            startup_status_encoded,
            nsic_status_encoded,
            blacklist_encoded,
            document_completeness,
            cross_validation_encoded,
            critical_failures,
        };
        // Strict validation: Must have exactly 28 features
        const keys = Object.keys(features);
        if (keys.length !== 28) {
            throw new Error(`Feature generator produced ${keys.length} features, expected exactly 28.`);
        }
        return features;
    }
}
exports.FeatureGeneratorService = FeatureGeneratorService;
exports.featureGenerator = new FeatureGeneratorService();
exports.default = exports.featureGenerator;
