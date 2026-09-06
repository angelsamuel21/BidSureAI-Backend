"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.complianceEngine = exports.ComplianceEngine = void 0;
const rules_1 = require("./rules");
class ComplianceEngine {
    evaluate(context) {
        const ruleResults = [];
        const riskFactors = [];
        // 1. Evaluate standard rules & any custom tender requirements
        for (const rule of rules_1.standardRules) {
            // Find if this tender has a custom requirement matching this rule
            const customReq = context.tenderRequirements.find((r) => r.code === rule.code || r.name.toLowerCase() === rule.name.toLowerCase());
            const result = rule.evaluate(context, customReq);
            ruleResults.push(result);
            // Collect risk factors
            if (result.status === 'FAIL') {
                riskFactors.push(`${result.ruleName}: ${result.explanation}`);
            }
            else if (result.status === 'WARNING' || result.status === 'MANUAL_REVIEW') {
                riskFactors.push(`${result.ruleName}: ${result.explanation}`);
            }
        }
        // 2. Evaluate Tender-Specific Criteria (Turnover / Experience)
        for (const req of context.tenderRequirements) {
            if (req.code === 'FIN_TURNOVER' && req.criteriaDetails?.minTurnoverCr) {
                const minTurnover = req.criteriaDetails.minTurnoverCr;
                const isMsme = context.bidder.category === 'MICRO' || context.bidder.category === 'SMALL';
                const isExempt = req.criteriaDetails.msmeExemptionApplicable && isMsme;
                if (isExempt) {
                    ruleResults.push({
                        ruleId: 'req-turnover-exempt',
                        ruleName: 'Minimum Annual Turnover Requirement',
                        category: 'FINANCIAL',
                        mandatory: true,
                        weight: req.weight || 10,
                        status: 'PASS',
                        score: 100,
                        evidence: `Turnover exemption granted under Public Procurement Policy (PPP) Order 2012 for ${context.bidder.category} enterprise.`,
                        explanation: `Bidder is registered as ${context.bidder.category} MSME enterprise, qualifying for turnover exemption.`,
                        confidence: 0.98,
                        source: 'PORTAL_SANDBOX',
                    });
                }
            }
        }
        // 3. Mathematical Weighted Compliance Scoring Formula
        // overallScore = (sum of passed/pro-rated rule scores * weight) / (sum of applicable weights)
        let totalWeight = 0;
        let weightedScoreSum = 0;
        for (const res of ruleResults) {
            if (res.status === 'NOT_APPLICABLE')
                continue;
            totalWeight += res.weight;
            // Weight contribution
            const ruleContribution = (res.score / 100) * res.weight;
            weightedScoreSum += ruleContribution;
        }
        const calculatedScore = totalWeight > 0 ? Math.round((weightedScoreSum / totalWeight) * 100) : 0;
        // 4. Critical Event Overrides: Debarment & Mandatory Rules
        const debarmentFailed = ruleResults.some((r) => r.ruleId === 'rule-debarment' && r.status === 'FAIL');
        const mandatoryFailed = ruleResults.some((r) => r.mandatory && r.status === 'FAIL');
        const hasMandatoryReview = ruleResults.some((r) => r.mandatory && r.status === 'MANUAL_REVIEW');
        const hasManualReview = ruleResults.some((r) => r.status === 'MANUAL_REVIEW');
        let riskLevel = 'LOW';
        let recommendation = 'COMPLIANT';
        const finalScore = calculatedScore;
        if (debarmentFailed) {
            riskLevel = 'CRITICAL';
            recommendation = 'NON-COMPLIANT';
        }
        else if (mandatoryFailed) {
            riskLevel = 'HIGH';
            recommendation = 'NON-COMPLIANT';
        }
        else if (hasMandatoryReview || hasManualReview || calculatedScore < 75) {
            riskLevel = hasMandatoryReview ? 'HIGH' : calculatedScore < 60 ? 'HIGH' : 'MEDIUM';
            recommendation = 'REQUIRES_MANUAL_REVIEW';
        }
        else {
            riskLevel = 'LOW';
            recommendation = 'COMPLIANT';
        }
        return {
            overallScore: finalScore,
            riskLevel,
            riskFactors,
            recommendation,
            ruleResults,
        };
    }
}
exports.ComplianceEngine = ComplianceEngine;
exports.complianceEngine = new ComplianceEngine();
exports.default = exports.complianceEngine;
