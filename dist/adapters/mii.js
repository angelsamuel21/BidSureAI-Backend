"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MakeInIndiaAdapter = void 0;
class MakeInIndiaAdapter {
    portalName = 'MII';
    async verify(claimedPercentage, context) {
        const claimed = parseFloat(claimedPercentage) || 0;
        const minRequired = context?.minRequiredPercent ?? 50;
        const oemDeclared = context?.oemDeclaredPercent;
        const referenceId = `DPIIT-MII-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date().toISOString();
        // Classification under Public Procurement (Preference to Make in India) Order
        let supplierClass = 'Non-Local Supplier (Local content < 20%)';
        if (claimed >= 50) {
            supplierClass = 'Class-I Local Supplier (Local content >= 50%)';
        }
        else if (claimed >= 20) {
            supplierClass = 'Class-II Local Supplier (Local content 20% - 49%)';
        }
        const satisfiesThreshold = claimed >= minRequired;
        // Cross-document Discrepancy Detection:
        // If bidder claims 65% in self-declaration, but OEM document specifies 42%, flag as discrepancy!
        let hasDiscrepancy = false;
        let discrepancyDetails = '';
        if (oemDeclared !== undefined && Math.abs(claimed - oemDeclared) > 5) {
            hasDiscrepancy = true;
            discrepancyDetails = `DISCREPANCY DETECTED: Bidder self-declared local content is ${claimed}%, but supporting OEM declaration specifies only ${oemDeclared}%.`;
        }
        const isVerified = satisfiesThreshold && !hasDiscrepancy;
        return {
            portal: 'MII',
            identifier: `${claimed}%`,
            status: isVerified ? 'VERIFIED' : hasDiscrepancy ? 'WARNING' : 'FAILED',
            source: 'DPIIT Public Procurement (MII) Evaluation (Sandbox Simulation)',
            checkedAt: timestamp,
            referenceId,
            isSandbox: true,
            verificationMethod: isVerified ? 'SANDBOX_VERIFIED' : hasDiscrepancy ? 'CROSS_VALIDATED' : 'FAILED',
            data: {
                claimedPercentage: claimed,
                minRequiredPercent: minRequired,
                supplierClassification: supplierClass,
                satisfiesThreshold,
                oemDeclaredPercent: oemDeclared,
                hasDiscrepancy,
                discrepancyDetails,
            },
            rawSummary: hasDiscrepancy
                ? discrepancyDetails
                : `Classified as ${supplierClass}. Declared ${claimed}% local content meets tender requirement (>= ${minRequired}%) (Sandbox Simulation).`,
        };
    }
}
exports.MakeInIndiaAdapter = MakeInIndiaAdapter;
