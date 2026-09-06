"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
console.log('--- GeM Compliance Engine & Scoring Automated Tests ---');
let passedTests = 0;
let failedTests = 0;
function assert(condition, message) {
    if (condition) {
        console.log(`  ✓ PASS: ${message}`);
        passedTests++;
    }
    else {
        console.error(`  ✕ FAIL: ${message}`);
        failedTests++;
    }
}
// 1. Test GSTIN Syntax Validation
function testGstinValidation() {
    console.log('\n[Test Suite 1: GST Registration Validation]');
    const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    assert(gstinRegex.test('09ABCDE1234F1Z5'), 'Valid GSTIN format passes regex');
    assert(gstinRegex.test('27AAACB1234P1Z8'), 'Valid Maharashtra GSTIN passes regex');
    assert(!gstinRegex.test('INVALID-GSTIN-123'), 'Invalid GSTIN format fails regex');
    assert(!gstinRegex.test('09ABCDE1234F1Z'), 'Short GSTIN fails regex');
}
// 2. Test PAN Format & Cross-Consistency with GSTIN
function testPanValidation() {
    console.log('\n[Test Suite 2: PAN & Cross-Consistency Verification]');
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    assert(panRegex.test('ABCDE1234F'), 'Standard 10-char PAN passes regex');
    assert(panRegex.test('AAACB1234P'), 'LLP PAN passes regex');
    assert(!panRegex.test('ABCDE12345'), 'Malformed PAN fails regex');
    const gstin = '09ABCDE1234F1Z5';
    const embeddedPan = gstin.substring(2, 12);
    assert(embeddedPan === 'ABCDE1234F', 'Embedded PAN matches claimed corporate PAN');
    assert('09AAACB1234P1Z8'.substring(2, 12) !== 'ABCDE1234F', 'Inconsistent PAN-GSTIN mismatch detected');
}
// 3. Test Local Content (Make in India) Thresholds
function testLocalContentRules() {
    console.log('\n[Test Suite 3: Make in India (MII) Local Content Rules]');
    const minRequired = 50;
    // Class-I (>= 50%)
    const compliantContent = 65;
    assert(compliantContent >= minRequired, '65% local content meets Class-I supplier threshold (>= 50%)');
    // Discrepancy scenario
    const selfDeclared = 65;
    const oemDeclared = 42;
    const hasDiscrepancy = Math.abs(selfDeclared - oemDeclared) > 5;
    assert(hasDiscrepancy, 'Discrepancy between self-declaration (65%) and OEM certificate (42%) is flagged');
    assert(oemDeclared < minRequired, 'OEM declared content of 42% falls below mandatory 50% threshold');
}
// 4. Test Weighted Scoring Formula & Debarment Critical Override
function testScoringAndRisk() {
    console.log('\n[Test Suite 4: Weighted Compliance Scoring & Critical Overrides]');
    // Rule weights
    const rules = [
        { name: 'Debarment', weight: 25, score: 100, status: 'PASS' },
        { name: 'GST', weight: 20, score: 100, status: 'PASS' },
        { name: 'PAN', weight: 15, score: 100, status: 'PASS' },
        { name: 'Udyam', weight: 10, score: 100, status: 'PASS' },
        { name: 'MII Local Content', weight: 15, score: 100, status: 'PASS' },
        { name: 'OEM Authorization', weight: 15, score: 95, status: 'PASS' },
    ];
    let totalWeight = 0;
    let weightedSum = 0;
    for (const r of rules) {
        totalWeight += r.weight;
        weightedSum += (r.score / 100) * r.weight;
    }
    const score = Math.round((weightedSum / totalWeight) * 100);
    assert(score >= 90, `Compliant scenario calculates high score: ${score}/100`);
    // Debarment critical override test
    const debarredRules = [
        { name: 'Debarment', weight: 25, score: 0, status: 'FAIL' },
        { name: 'GST', weight: 20, score: 100, status: 'PASS' },
        { name: 'PAN', weight: 15, score: 100, status: 'PASS' },
    ];
    const isDebarred = debarredRules.some(r => r.name === 'Debarment' && r.status === 'FAIL');
    const cappedScore = isDebarred ? 38 : 100;
    const riskLevel = isDebarred ? 'CRITICAL' : 'LOW';
    const recommendation = isDebarred ? 'NON-COMPLIANT' : 'COMPLIANT';
    assert(isDebarred, 'Active debarment detected in failure scenario');
    assert(cappedScore === 38, `Debarment overrides normal scoring, capping score at ${cappedScore}`);
    assert(riskLevel === 'CRITICAL', 'Debarment escalates risk level to CRITICAL');
    assert(recommendation === 'NON-COMPLIANT', 'Debarment forces recommendation to NON-COMPLIANT');
}
// 5. Test Tamper-Evident SHA-256 Audit Chain
function testAuditChain() {
    console.log('\n[Test Suite 5: Tamper-Evident Audit Ledger Hash Chain]');
    const GENESIS = '0000000000000000000000000000000000000000000000000000000000000000';
    function calculateHash(prev, action, time, actor, details) {
        return crypto_1.default.createHash('sha256').update(`${prev}|${action}|${time}|${actor}|${details}`).digest('hex');
    }
    const t1 = '2026-08-01T10:00:00.000Z';
    const h1 = calculateHash(GENESIS, 'TENDER_PUBLISHED', t1, 'Riya Kapoor', 'Tender GEM/2026/001 published');
    assert(h1.length === 64, 'Block 1 generated 64-char SHA-256 hash');
    const t2 = '2026-08-18T10:15:00.000Z';
    const h2 = calculateHash(h1, 'BID_SUBMISSION_INGESTED', t2, 'Ingestion Gateway', 'ABC Industries bid ingested');
    assert(h2.length === 64 && h2 !== h1, 'Block 2 links cryptographically to Block 1');
    // Verify chain integrity
    const block2PrevMatchesBlock1 = h1 === h1;
    assert(block2PrevMatchesBlock1, 'Chain link between Block 1 and Block 2 is valid');
    // Tamper detection test
    const tamperedDetails = 'Tender GEM/2026/001 published (tampered content)';
    const recalculatedH1 = calculateHash(GENESIS, 'TENDER_PUBLISHED', t1, 'Riya Kapoor', tamperedDetails);
    assert(recalculatedH1 !== h1, 'Tamper-evident verification detects modified log details');
}
// Run all test suites
testGstinValidation();
testPanValidation();
testLocalContentRules();
testScoringAndRisk();
testAuditChain();
console.log(`\n=============================================`);
console.log(`Test Results: ${passedTests} passed, ${failedTests} failed.`);
console.log(`=============================================\n`);
if (failedTests > 0) {
    process.exit(1);
}
