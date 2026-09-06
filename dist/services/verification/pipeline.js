"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationPipelineService = exports.VerificationPipelineService = void 0;
const mongodb_1 = require("../../db/mongodb");
const Tender_1 = require("../../models/Tender");
const Bidder_1 = require("../../models/Bidder");
const Bid_1 = require("../../models/Bid");
const Document_1 = require("../../models/Document");
const Verification_1 = require("../../models/Verification");
const ComplianceResult_1 = require("../../models/ComplianceResult");
const Recommendation_1 = require("../../models/Recommendation");
const audit_1 = require("../audit");
const adapters_1 = require("../../adapters");
const compliance_1 = require("../compliance");
const ai_1 = require("../ai");
const featureGenerator_1 = require("../featureGenerator");
class VerificationPipelineService {
    /**
     * Executes the full end-to-end verification pipeline on a specific bid.
     * Idempotent: Updates the existing bid without creating duplicate records.
     */
    async executePipeline(bidId) {
        await (0, mongodb_1.connectToDatabase)();
        // 1. Fetch Bid
        let bidDoc = null;
        if (typeof bidId === 'string' && /^[0-9a-fA-F]{24}$/.test(bidId)) {
            bidDoc = await Bid_1.Bid.findById(bidId);
        }
        if (!bidDoc) {
            bidDoc = await Bid_1.Bid.findOne({ $or: [{ id: bidId }, { _id: bidId }] }).catch(() => null);
        }
        if (!bidDoc) {
            throw new Error(`Bid with ID "${bidId}" not found in database.`);
        }
        const tenderIdentifier = bidDoc.tenderId || bidDoc.tenderNumber || 'GEM/2026/001';
        // 2. Fetch Tender & Requirements
        const tenderOrClauses = [
            { tenderNumber: tenderIdentifier },
            { tenderId: tenderIdentifier },
        ];
        if (typeof tenderIdentifier === 'string' && /^[0-9a-fA-F]{24}$/.test(tenderIdentifier)) {
            tenderOrClauses.push({ _id: tenderIdentifier });
        }
        const tenderDoc = (await Tender_1.Tender.findOne({ $or: tenderOrClauses })) || (await Tender_1.Tender.findOne());
        const tenderTitle = tenderDoc?.title || 'Industrial Supply and Services Tender';
        const tenderNumber = tenderDoc?.tenderNumber || tenderDoc?.tenderId || tenderIdentifier;
        const tenderDbId = tenderDoc?.id || tenderDoc?._id?.toString() || tenderIdentifier;
        const requirements = tenderDoc?.requirements || [];
        // 3. Fetch Uploaded Documents for this Bid
        const docRecords = await Document_1.DocumentModel.find({ bidId }).lean();
        let uploadedDocs = [];
        if (docRecords && docRecords.length > 0) {
            uploadedDocs = docRecords.map((d) => ({
                id: d._id.toString(),
                bidId,
                name: d.name || d.fileName,
                fileName: d.fileName || d.name,
                sizeBytes: d.sizeBytes || d.fileSize || 0,
                mimeType: d.mimeType || d.fileType || 'application/pdf',
                sha256Hash: d.sha256Hash || d.sha256 || '',
                documentType: d.documentType,
                uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
                processingStatus: d.processingStatus || 'PROCESSED',
                extractionMethod: d.extractionMethod || 'TEXT',
                extractedText: d.extractedText,
                extractedFields: d.extractedFields || {},
            }));
        }
        else if (bidDoc.documents && bidDoc.documents.length > 0) {
            uploadedDocs = bidDoc.documents.map((d) => ({
                id: d._id?.toString() || d.id || `doc-${Date.now()}`,
                bidId,
                name: d.name || d.fileName,
                fileName: d.fileName || d.name,
                sizeBytes: d.sizeBytes || d.fileSize || 0,
                mimeType: d.mimeType || d.fileType || 'application/pdf',
                sha256Hash: d.sha256Hash || d.sha256 || '',
                documentType: d.documentType,
                uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : new Date().toISOString(),
                processingStatus: d.processingStatus || 'PROCESSED',
                extractionMethod: d.extractionMethod || 'TEXT',
                extractedText: d.extractedText,
                extractedFields: d.extractedFields || {},
            }));
        }
        // 4. Extract Real Bidder Statutory Identifiers from Documents
        let extractedGstin = undefined;
        let extractedPan = undefined;
        let extractedUdyam = undefined;
        let extractedLegalName = undefined;
        let claimedLocalContent = undefined;
        let oemLocalContent = undefined;
        for (const doc of uploadedDocs) {
            const fields = doc.extractedFields || {};
            if (fields.gstin && !extractedGstin)
                extractedGstin = String(fields.gstin).trim().toUpperCase();
            if (fields.pan && !extractedPan)
                extractedPan = String(fields.pan).trim().toUpperCase();
            if (fields.udyamNumber && !extractedUdyam)
                extractedUdyam = String(fields.udyamNumber).trim().toUpperCase();
            if (fields.legalName && !extractedLegalName)
                extractedLegalName = String(fields.legalName).trim();
            if (fields.companyName && !extractedLegalName)
                extractedLegalName = String(fields.companyName).trim();
            if (fields.localContentPercent !== undefined && fields.localContentPercent !== null) {
                claimedLocalContent = Number(fields.localContentPercent);
            }
            if (fields.oemLocalContentPercent !== undefined && fields.oemLocalContentPercent !== null) {
                oemLocalContent = Number(fields.oemLocalContentPercent);
            }
        }
        // Derive PAN from GSTIN if PAN is missing (characters 3-12 of 15-char GSTIN)
        if (!extractedPan && extractedGstin && extractedGstin.length === 15) {
            extractedPan = extractedGstin.substring(2, 12);
        }
        // 5. Resolve Bidder Profile
        const bidderName = extractedLegalName || bidDoc.bidderName || 'Participating Bidder';
        let bidderDoc = null;
        if (typeof bidDoc.bidderId === 'string' && /^[0-9a-fA-F]{24}$/.test(bidDoc.bidderId)) {
            bidderDoc = await Bidder_1.Bidder.findById(bidDoc.bidderId).catch(() => null);
        }
        if (!bidderDoc) {
            bidderDoc = await Bidder_1.Bidder.findOne({
                $or: [
                    { name: { $regex: new RegExp(`^${bidderName.trim()}$`, 'i') } },
                    ...(extractedGstin ? [{ gstin: extractedGstin }] : []),
                ],
            });
        }
        let isDebarred = Boolean(bidderDoc?.isDebarred);
        if (bidderDoc) {
            if (extractedGstin)
                bidderDoc.gstin = extractedGstin;
            if (extractedPan)
                bidderDoc.pan = extractedPan;
            if (extractedUdyam)
                bidderDoc.udyamNumber = extractedUdyam;
            if (isDebarred)
                bidderDoc.isDebarred = true;
            await bidderDoc.save();
        }
        else {
            bidderDoc = await Bidder_1.Bidder.create({
                name: bidderName,
                registrationNumber: `REG-${Date.now()}`,
                gstin: extractedGstin || '',
                pan: extractedPan || '',
                udyamNumber: extractedUdyam,
                contactEmail: 'bidder@example.com',
                contactPhone: '+91-9999999999',
                address: 'Industrial Estate, India',
                category: 'MICRO',
                isDebarred,
            });
        }
        const bidderDomain = {
            id: bidderDoc._id.toString(),
            name: bidderName,
            registrationNumber: bidderDoc.registrationNumber || `REG-${Date.now()}`,
            gstin: bidderDoc.gstin || extractedGstin || '',
            pan: bidderDoc.pan || extractedPan || '',
            udyamNumber: bidderDoc.udyamNumber || extractedUdyam,
            contactEmail: bidderDoc.contactEmail || 'bidder@example.com',
            contactPhone: bidderDoc.contactPhone || '+91-9999999999',
            address: bidderDoc.address || 'Industrial Estate, India',
            category: bidderDoc.category || 'MICRO',
            isDebarred: isDebarred || bidderDoc.isDebarred,
        };
        // 6. Run Statutory Verification Adapters
        const portalRecords = await adapters_1.sandboxGateway.verifyAll({
            legalName: bidderDomain.name,
            gstin: bidderDomain.gstin,
            pan: bidderDomain.pan,
            udyamNumber: bidderDomain.udyamNumber,
            claimedLocalContentPercent: claimedLocalContent,
            oemLocalContentPercent: oemLocalContent,
            minLocalContentPercent: 50,
        });
        if (portalRecords.debarment?.status === 'FAILED') {
            isDebarred = true;
            bidderDomain.isDebarred = true;
        }
        // 7. Run Deterministic Compliance Rules Engine
        const ruleEvaluation = compliance_1.complianceEngine.evaluate({
            tenderRequirements: requirements,
            bidder: bidderDomain,
            documents: uploadedDocs,
            portalRecords,
        });
        // 8. Generate Exactly 28 ML Features via Centralized Feature Generator
        const mlFeatures = featureGenerator_1.featureGenerator.generateFeatures({
            tenderRequirements: requirements,
            bidder: bidderDomain,
            documents: uploadedDocs,
            portalRecords,
            ruleResults: ruleEvaluation.ruleResults,
        });
        // 9. MLService Inference (Model 1 Tender Classifier & Model 2 Risk Classifier)
        const mlPrediction = await adapters_1.mlServiceAdapter.predict({
            task: 'all',
            tenderTitle,
            tenderDescription: tenderDoc?.description || '',
            ruleScores: ruleEvaluation.ruleResults.map((r) => r.score),
            criticalFlags: ruleEvaluation.riskFactors,
            features: mlFeatures,
        });
        // 10. Apply Deterministic Override Guardrails
        // IF bidder is actively blacklisted/debarred OR critical statutory failure exists:
        // FINAL RESULT = CRITICAL (for debarment) / HIGH (for mandatory failures), recommendation = NON-COMPLIANT
        let finalRiskLevel = ruleEvaluation.riskLevel;
        let finalRecommendation = ruleEvaluation.recommendation;
        const finalScore = ruleEvaluation.overallScore;
        if (isDebarred) {
            finalRiskLevel = 'CRITICAL';
            finalRecommendation = 'NON-COMPLIANT';
        }
        else if (mlFeatures.critical_failures > 0) {
            finalRiskLevel = 'HIGH';
            finalRecommendation = 'NON-COMPLIANT';
        }
        else if (mlPrediction && mlPrediction.success) {
            // Integrate ML prediction if not overridden
            if (mlPrediction.riskLevel === 'CRITICAL' || mlPrediction.riskLevel === 'HIGH') {
                finalRiskLevel = mlPrediction.riskLevel;
            }
            if (mlPrediction.anomalyDetected && finalRiskLevel === 'LOW') {
                finalRiskLevel = 'MEDIUM';
            }
        }
        // 11. Run AI Analysis for Findings & Summary
        const aiAnalysis = await ai_1.aiVerificationEngine.analyze({
            bidderName: bidderDomain.name,
            tenderTitle,
            extractedFields: {
                gstin: bidderDomain.gstin,
                pan: bidderDomain.pan,
                udyamNumber: bidderDomain.udyamNumber,
                claimedLocalContent,
            },
            documents: uploadedDocs.map((d) => ({ name: d.name, type: d.documentType })),
            ruleDiscrepancies: ruleEvaluation.riskFactors,
            ruleResults: ruleEvaluation.ruleResults,
            isDebarred,
        });
        const evaluationId = `eval-${Date.now()}`;
        const evaluation = {
            id: evaluationId,
            bidId,
            overallScore: finalScore,
            riskLevel: finalRiskLevel,
            riskFactors: ruleEvaluation.riskFactors,
            recommendation: finalRecommendation,
            aiSummary: aiAnalysis.summary,
            ruleResults: ruleEvaluation.ruleResults,
            aiFindings: aiAnalysis.findings,
            portalVerifications: Object.values(portalRecords),
            evaluatedAt: new Date().toISOString(),
        };
        const initialStatus = finalRecommendation === 'COMPLIANT' ? 'EVALUATED' : 'CLARIFICATION_REQUESTED';
        // 12. Idempotently Update Bid in MongoDB (NO duplicate bids created!)
        bidDoc.bidderId = bidderDomain.id;
        bidDoc.bidderName = bidderDomain.name;
        bidDoc.tenderId = tenderDbId;
        bidDoc.tenderNumber = tenderNumber;
        bidDoc.complianceScore = finalScore;
        bidDoc.riskLevel = finalRiskLevel;
        bidDoc.recommendation = finalRecommendation;
        bidDoc.status = initialStatus;
        bidDoc.evaluation = evaluation;
        bidDoc.verifications = ruleEvaluation.ruleResults.map((r) => ({
            bidId,
            ruleId: r.ruleId,
            ruleName: r.ruleName,
            category: r.category,
            mandatory: r.mandatory,
            status: r.status,
            source: r.source,
            verificationMethod: r.verificationMethod,
            verificationStatusLabel: r.verificationStatusLabel,
            failureReason: r.failureReason,
            isCritical: r.isCritical,
            documentName: r.documentName || r.documentReference,
            extractedValue: r.extractedValue,
            verifiedValue: r.portalVerifiedValue,
            explanation: r.explanation,
            evidence: r.evidence,
            score: r.score,
            confidence: r.confidence,
        }));
        await bidDoc.save();
        // 13. Persist ComplianceResult Record Idempotently
        await ComplianceResult_1.ComplianceResult.findOneAndUpdate({ bidId }, {
            bidId,
            score: finalScore,
            overallScore: finalScore,
            riskLevel: finalRiskLevel,
            status: finalRecommendation,
            recommendation: finalRecommendation,
            summary: aiAnalysis.summary,
            aiSummary: aiAnalysis.summary,
            riskFactors: ruleEvaluation.riskFactors,
            ruleResults: ruleEvaluation.ruleResults,
            portalVerifications: Object.values(portalRecords),
            aiFindings: aiAnalysis.findings,
            evaluatedAt: new Date(),
        }, { upsert: true, new: true });
        // 14. Persist Verification Records Idempotently
        await Verification_1.Verification.deleteMany({ bidId });
        for (const r of ruleEvaluation.ruleResults) {
            await Verification_1.Verification.create({
                bidId,
                ruleId: r.ruleId,
                ruleName: r.ruleName,
                category: r.category,
                mandatory: r.mandatory,
                status: r.status,
                source: r.source,
                verificationMethod: r.verificationMethod,
                verificationStatusLabel: r.verificationStatusLabel,
                failureReason: r.failureReason,
                isCritical: r.isCritical,
                documentName: r.documentName || r.documentReference,
                extractedValue: r.extractedValue,
                verifiedValue: r.portalVerifiedValue,
                explanation: r.explanation,
                evidence: r.evidence,
                score: r.score,
                confidence: r.confidence,
            });
        }
        // 15. Persist Deterministic Recommendations
        const recs = [];
        for (const rule of ruleEvaluation.ruleResults) {
            if (rule.status === 'FAIL') {
                recs.push({
                    finding: `${rule.ruleName}: ${rule.explanation}`,
                    recommendation: rule.ruleId === 'rule-debarment'
                        ? 'Mandatory disqualification required under GFR 2017 Rule 151.'
                        : rule.ruleId === 'rule-oem'
                            ? 'Mandatory technical requirement failed. Disqualification recommended unless valid MAF is provided.'
                            : `Verify ${rule.ruleName} compliance. ${rule.evidence}`,
                    severity: rule.ruleId === 'rule-debarment' ? 'CRITICAL' : 'HIGH',
                });
            }
            else if (rule.status === 'MANUAL_REVIEW') {
                recs.push({
                    finding: `${rule.ruleName}: ${rule.explanation}`,
                    recommendation: `Manual officer review required. ${rule.evidence}`,
                    severity: 'WARNING',
                });
            }
        }
        if (recs.length === 0) {
            recs.push({
                finding: 'All statutory, financial, and technical credentials satisfy tender requirements.',
                recommendation: 'Bid appears compliant. Eligible for qualification pending officer review.',
                severity: 'INFO',
            });
        }
        await Recommendation_1.Recommendation.findOneAndUpdate({ bidId }, {
            bidId,
            recommendations: recs,
            generatedAt: new Date(),
            generatedBy: 'Deterministic Recommendation Engine',
        }, { upsert: true, new: true });
        // 16. Log Tamper-Evident Audit Event
        await audit_1.auditService.log({
            actor: 'Automated Compliance Pipeline',
            role: 'PROCUREMENT_OFFICER',
            action: 'COMPLIANCE_EVALUATION_COMPLETED',
            bidId,
            tenderId: tenderNumber,
            bidderId: bidderDomain.id,
            details: `Verification pipeline completed for "${bidderDomain.name}". Score: ${finalScore}/100. Risk: ${finalRiskLevel}. Recommendation: ${finalRecommendation}. Evaluated 28 ML features via Model 2 and verified statutory records across GSTN, PAN, and Debarment registries.`,
        });
        const finalBid = {
            id: bidDoc._id.toString(),
            tenderId: tenderDbId,
            tenderNumber,
            bidderId: bidderDomain.id,
            bidderName: bidderDomain.name,
            submittedAt: bidDoc.submittedAt instanceof Date ? bidDoc.submittedAt.toISOString() : new Date().toISOString(),
            status: initialStatus,
            documents: uploadedDocs,
            evaluation,
            clarifications: (bidDoc.clarifications || []),
            officerDecision: bidDoc.officerDecision,
        };
        return {
            bid: finalBid,
            evaluation,
            mlResult: mlPrediction,
        };
    }
}
exports.VerificationPipelineService = VerificationPipelineService;
exports.verificationPipelineService = new VerificationPipelineService();
exports.default = exports.verificationPipelineService;
