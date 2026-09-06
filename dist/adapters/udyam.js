"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UdyamAdapter = void 0;
class UdyamAdapter {
    portalName = 'UDYAM';
    async verify(udyamNumber, context) {
        const cleanUdyam = (udyamNumber || '').trim().toUpperCase();
        // Standard Udyam format: UDYAM-XX-00-0000000 (XX is 2 letter state code)
        const udyamRegex = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
        const isValidFormat = udyamRegex.test(cleanUdyam);
        const referenceId = `MSME-UDYAM-SANDBOX-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;
        const timestamp = new Date().toISOString();
        if (!cleanUdyam || !isValidFormat) {
            return {
                portal: 'UDYAM',
                identifier: cleanUdyam || 'EMPTY',
                status: 'FAILED',
                source: 'Ministry of MSME Syntax Validator (Local Regex)',
                checkedAt: timestamp,
                referenceId,
                isSandbox: true,
                verificationMethod: 'FAILED',
                data: {
                    validFormat: false,
                    error: 'Invalid Udyam registration number. Format must be UDYAM-XX-00-0000000 (e.g., UDYAM-UP-01-0019284).',
                },
                rawSummary: 'Udyam Registration verification failed due to syntax mismatch.',
            };
        }
        const sandboxRegistry = {
            'UDYAM-UP-01-0019284': {
                enterpriseName: 'ABC Industries Pvt. Ltd.',
                enterpriseType: 'MICRO',
                majorActivity: 'MANUFACTURING',
                nicCode: '2819 - Manufacture of general purpose machinery',
                dateOfIncorporation: '2018-04-12',
                pppBenefitsEligible: true, // EMD & Prior Experience exemption eligible under PPP Order 2012
                dicLocation: 'Kanpur, Uttar Pradesh',
                status: 'Active',
            },
            'UDYAM-MH-12-0048192': {
                enterpriseName: 'XYZ Enterprises',
                enterpriseType: 'SMALL',
                majorActivity: 'MANUFACTURING',
                nicCode: '2829 - Manufacture of special purpose machinery',
                dateOfIncorporation: '2019-08-15',
                pppBenefitsEligible: true,
                dicLocation: 'Pune, Maharashtra',
                status: 'Active',
            },
        };
        const matched = sandboxRegistry[cleanUdyam] || {
            enterpriseName: context?.expectedLegalName || 'Registered MSME Entity',
            enterpriseType: 'SMALL',
            majorActivity: 'MANUFACTURING',
            nicCode: '2819 - General Manufacturing',
            dateOfIncorporation: '2020-01-01',
            pppBenefitsEligible: true,
            dicLocation: 'Industrial Area',
            status: 'Active',
        };
        return {
            portal: 'UDYAM',
            identifier: cleanUdyam,
            status: 'VERIFIED',
            source: 'Ministry of MSME Udyam Sandbox Gateway (External live verification unavailable)',
            checkedAt: timestamp,
            referenceId,
            isSandbox: true,
            verificationMethod: 'SANDBOX_VERIFIED',
            data: {
                ...matched,
                emdExemptionEntitled: matched.pppBenefitsEligible && (matched.enterpriseType === 'MICRO' || matched.enterpriseType === 'SMALL'),
                priorExperienceExemptionEntitled: matched.pppBenefitsEligible && (matched.enterpriseType === 'MICRO' || matched.enterpriseType === 'SMALL'),
            },
            rawSummary: `Udyam Number ${cleanUdyam} format valid. Enterprise classification (${matched.enterpriseType}) simulated in sandbox for "${matched.enterpriseName}" (External live verification unavailable).`,
        };
    }
}
exports.UdyamAdapter = UdyamAdapter;
