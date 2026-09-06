"use strict";
console.log('=== Starting End-to-End Live Journey Validation ===\n');
const BASE_URL = 'http://localhost:3000';
async function runTests() {
    let passed = 0;
    let failed = 0;
    function assert(condition, message) {
        if (condition) {
            console.log(`✓ PASS: ${message}`);
            passed++;
        }
        else {
            console.error(`✕ FAIL: ${message}`);
            failed++;
        }
    }
    try {
        // 1. Test Login as Procurement Officer
        console.log('[Step 1: Authentication Test]');
        const loginRes = await fetch(`${BASE_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'riya.kapoor@cpcl.gov.in',
                password: 'password123',
            }),
        });
        const loginData = await loginRes.json();
        assert(loginRes.ok && loginData.success, 'Procurement Officer logged in successfully');
        assert(loginData.user.role === 'PROCUREMENT_OFFICER', 'Role is PROCUREMENT_OFFICER');
        const poCookie = loginRes.headers.get('set-cookie');
        // 2. Fetch Tenders
        console.log('\n[Step 2: Tender Fetch Test]');
        const tendersRes = await fetch(`${BASE_URL}/api/tenders`);
        const tendersData = await tendersRes.json();
        assert(tendersData.success && tendersData.tenders.length > 0, 'Tender GEM/2026/001 retrieved');
        const tender = tendersData.tenders[0];
        // 3. Test Verification: ABC Industries (Scenario 1)
        console.log('\n[Step 3: Verification Scenario 1 — ABC Industries (Compliant)]');
        const verifyAbcRes = await fetch(`${BASE_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenderId: tender.tenderId,
                bidderData: {
                    name: 'ABC Industries Pvt. Ltd.',
                    gstin: '09ABCDE1234F1Z5',
                    pan: 'ABCDE1234F',
                    udyamNumber: 'UDYAM-UP-01-0019284',
                },
                documents: [
                    {
                        id: 'doc-abc-1',
                        name: 'GST Certificate.pdf',
                        sizeBytes: 1254820,
                        mimeType: 'application/pdf',
                        sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
                        documentType: 'GST_REGISTRATION_CERTIFICATE',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { gstin: '09ABCDE1234F1Z5', legalName: 'ABC Industries Pvt. Ltd.' },
                    },
                    {
                        id: 'doc-abc-2',
                        name: 'PAN Certificate.pdf',
                        sizeBytes: 849310,
                        mimeType: 'application/pdf',
                        sha256Hash: 'a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e',
                        documentType: 'PAN_CARD',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { pan: 'ABCDE1234F', legalName: 'ABC Industries Pvt. Ltd.' },
                    },
                    {
                        id: 'doc-abc-3',
                        name: 'OEM Authorization.pdf',
                        sizeBytes: 1680120,
                        mimeType: 'application/pdf',
                        sha256Hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
                        documentType: 'OEM_AUTHORIZATION_LETTER',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { isOemAuthorizationValid: true, oemLocalContentPercent: 65 },
                    },
                    {
                        id: 'doc-abc-4',
                        name: 'Local Content Declaration.pdf',
                        sizeBytes: 920400,
                        mimeType: 'application/pdf',
                        sha256Hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
                        documentType: 'MAKE_IN_INDIA_DECLARATION',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { localContentPercent: 65 },
                    },
                ],
            }),
        });
        const abcData = await verifyAbcRes.json();
        assert(abcData.success, 'ABC Industries verification completed');
        assert(abcData.evaluation.overallScore >= 90, `ABC Score is high: ${abcData.evaluation.overallScore}/100`);
        assert(abcData.evaluation.riskLevel === 'LOW', `ABC Risk is LOW: ${abcData.evaluation.riskLevel}`);
        assert(abcData.evaluation.recommendation === 'COMPLIANT', `ABC Recommendation is COMPLIANT`);
        // Approve ABC
        console.log('\n[Step 4: Officer Approval for ABC Industries]');
        const approveAbcRes = await fetch(`${BASE_URL}/api/bids/${abcData.bid.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(poCookie ? { Cookie: poCookie } : {}),
            },
            body: JSON.stringify({
                actionType: 'APPROVE',
                justification: 'Bid meets all tender requirements. Approved.',
                officerName: 'Riya Kapoor',
                officerRole: 'PROCUREMENT_OFFICER',
            }),
        });
        const approveAbcData = await approveAbcRes.json();
        assert(approveAbcData.success, 'ABC Industries approved');
        assert(approveAbcData.bid.status === 'QUALIFIED', 'ABC Bid status is now QUALIFIED');
        assert(approveAbcData.bid.officerDecision.decision === 'APPROVE', 'Officer decision is recorded as APPROVE');
        // 4. Test Verification: XYZ Enterprises (Scenario 2 - Discrepancy)
        console.log('\n[Step 5: Verification Scenario 2 — XYZ Enterprises (Discrepancy)]');
        const verifyXyzRes = await fetch(`${BASE_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenderId: tender.tenderId,
                bidderData: {
                    name: 'XYZ Enterprises',
                    gstin: '27AAACB1234P1Z8',
                    pan: 'AAACB1234P',
                    udyamNumber: 'UDYAM-MH-12-0048192',
                },
                documents: [
                    {
                        id: 'doc-xyz-1',
                        name: 'GST Certificate.pdf',
                        sizeBytes: 1140000,
                        mimeType: 'application/pdf',
                        sha256Hash: 'b3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b811',
                        documentType: 'GST_REGISTRATION_CERTIFICATE',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { gstin: '27AAACB1234P1Z8', legalName: 'XYZ Enterprises' },
                    },
                    {
                        id: 'doc-xyz-2',
                        name: 'OEM Authorization.pdf',
                        sizeBytes: 1540000,
                        mimeType: 'application/pdf',
                        sha256Hash: 'd591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f1433',
                        documentType: 'OEM_AUTHORIZATION_LETTER',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { isOemAuthorizationValid: true, oemLocalContentPercent: 42 },
                    },
                    {
                        id: 'doc-xyz-3',
                        name: 'Local Content Declaration.pdf',
                        sizeBytes: 890000,
                        mimeType: 'application/pdf',
                        sha256Hash: 'e591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f1444',
                        documentType: 'MAKE_IN_INDIA_DECLARATION',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { localContentPercent: 65 },
                    },
                ],
            }),
        });
        const xyzData = await verifyXyzRes.json();
        assert(xyzData.success, 'XYZ Enterprises verification completed');
        assert(xyzData.evaluation.overallScore <= 75, `XYZ Score reflects discrepancy: ${xyzData.evaluation.overallScore}/100`);
        assert(xyzData.evaluation.riskLevel === 'HIGH', `XYZ Risk is HIGH: ${xyzData.evaluation.riskLevel}`);
        assert(xyzData.evaluation.recommendation === 'REQUIRES_MANUAL_REVIEW', `XYZ Recommendation is REQUIRES_MANUAL_REVIEW`);
        // Request Clarification for XYZ
        console.log('\n[Step 6: Officer Requests Clarification for XYZ Enterprises]');
        const clarXyzRes = await fetch(`${BASE_URL}/api/bids/${xyzData.bid.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(poCookie ? { Cookie: poCookie } : {}),
            },
            body: JSON.stringify({
                actionType: 'REQUEST_CLARIFICATION',
                justification: 'Discrepancy between self-declaration and OEM certificate.',
                clarification: {
                    clauseReference: 'PPP-MII Clause 3.4',
                    queryText: 'Discrepancy detected: The submitted local-content document indicates 42%, while the tender requires at least 50%.',
                    deadline: '2026-09-10T18:00:00Z',
                },
                officerName: 'Riya Kapoor',
                officerRole: 'PROCUREMENT_OFFICER',
            }),
        });
        const clarXyzData = await clarXyzRes.json();
        assert(clarXyzData.success, 'Clarification request issued successfully');
        assert(clarXyzData.bid.status === 'CLARIFICATION_REQUESTED', 'XYZ Bid status is CLARIFICATION_REQUESTED');
        // 5. Test Verification: PQR Technologies (Scenario 3 - Debarred)
        console.log('\n[Step 7: Verification Scenario 3 — PQR Technologies (Debarred)]');
        const verifyPqrRes = await fetch(`${BASE_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                tenderId: tender.tenderId,
                bidderData: {
                    name: 'PQR Technologies',
                    gstin: '07AAAAA0000A1Z9',
                    pan: 'AAAAA0000A',
                },
                documents: [
                    {
                        id: 'doc-pqr-1',
                        name: 'GST Certificate.pdf',
                        sizeBytes: 1050000,
                        mimeType: 'application/pdf',
                        sha256Hash: 'f3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b899',
                        documentType: 'GST_REGISTRATION_CERTIFICATE',
                        uploadedAt: new Date().toISOString(),
                        extractedFields: { gstin: '07AAAAA0000A1Z9', legalName: 'PQR Technologies' },
                    },
                ],
            }),
        });
        const pqrData = await verifyPqrRes.json();
        assert(pqrData.success, 'PQR Technologies verification completed');
        assert(pqrData.evaluation.overallScore <= 45, `PQR Debarred score is capped at ${pqrData.evaluation.overallScore}/100`);
        assert(pqrData.evaluation.riskLevel === 'CRITICAL', `PQR Risk is CRITICAL: ${pqrData.evaluation.riskLevel}`);
        assert(pqrData.evaluation.recommendation === 'NON-COMPLIANT', `PQR Recommendation is NON-COMPLIANT`);
        // Reject PQR
        console.log('\n[Step 8: Officer Rejection for PQR Technologies]');
        const rejectPqrRes = await fetch(`${BASE_URL}/api/bids/${pqrData.bid.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(poCookie ? { Cookie: poCookie } : {}),
            },
            body: JSON.stringify({
                actionType: 'REJECT',
                justification: 'Active debarment on CVC / MoPNG registry under GFR 2017 Rule 151.',
                officerName: 'Riya Kapoor',
                officerRole: 'PROCUREMENT_OFFICER',
            }),
        });
        const rejectPqrData = await rejectPqrRes.json();
        assert(rejectPqrData.success, 'PQR Technologies disqualified');
        assert(rejectPqrData.bid.status === 'DISQUALIFIED', 'PQR Bid status is DISQUALIFIED');
        // 6. Test Server-Side RBAC: Vigilance Auditor cannot make decisions
        console.log('\n[Step 9: Server-Side RBAC Enforcement Test]');
        const auditorLoginRes = await fetch(`${BASE_URL}/api/auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'ks.ramanathan@cpcl.gov.in',
                password: 'password123',
            }),
        });
        const auditorCookie = auditorLoginRes.headers.get('set-cookie');
        const unauthorizedRes = await fetch(`${BASE_URL}/api/bids/${abcData.bid.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...(auditorCookie ? { Cookie: auditorCookie } : {}),
            },
            body: JSON.stringify({
                actionType: 'REJECT',
                justification: 'Unauthorized decision attempt by auditor',
                officerRole: 'VIGILANCE_AUDITOR',
            }),
        });
        assert(unauthorizedRes.status === 403, 'Server-side RBAC rejected Vigilance Auditor decision with 403 Forbidden');
        // 7. Test Audit Trail Integrity
        console.log('\n[Step 10: Tamper-Evident Audit Trail Integrity Test]');
        const auditRes = await fetch(`${BASE_URL}/api/audit`);
        const auditData = await auditRes.json();
        assert(auditData.success, 'Audit trail retrieved successfully');
        assert(auditData.chainIntegrity?.isValid === true, 'Audit ledger SHA-256 block chain integrity is VALID (100% verified)');
        assert(auditData.logs.length >= 6, `Audit trail recorded ${auditData.logs.length} verifiable actions`);
        console.log('\n=============================================');
        console.log(`Live Journey Results: ${passed} passed, ${failed} failed.`);
        console.log('=============================================\n');
        if (failed > 0)
            process.exit(1);
    }
    catch (err) {
        console.error('Fatal error during live validation:', err);
        process.exit(1);
    }
}
runTests();
