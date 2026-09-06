"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verificationService = exports.VerificationService = void 0;
const mongodb_1 = require("../../db/mongodb");
const Tender_1 = require("../../models/Tender");
const Bid_1 = require("../../models/Bid");
const Document_1 = require("../../models/Document");
const pipeline_1 = require("./pipeline");
class VerificationService {
    /**
     * Run verification for an existing bid by ID.
     */
    async runVerificationForBid(bidId) {
        return pipeline_1.verificationPipelineService.executePipeline(bidId);
    }
    /**
     * Run verification from input (legacy / generic endpoint).
     * Idempotently resolves or creates the bid, persists documents, and runs the pipeline.
     */
    async runVerification(input) {
        await (0, mongodb_1.connectToDatabase)();
        if (input.bidId) {
            return this.runVerificationForBid(input.bidId);
        }
        const tenderIdentifier = input.tenderId || 'GEM/2026/001';
        const bidderName = input.bidderData?.name || 'New Participating Bidder';
        // Check if an existing pending/evaluated bid exists for this tender and bidder
        let existingBid = await Bid_1.Bid.findOne({
            $or: [
                { tenderId: tenderIdentifier },
                { tenderNumber: tenderIdentifier },
            ],
            bidderName: { $regex: new RegExp(`^${bidderName.trim()}$`, 'i') },
        });
        if (!existingBid) {
            // Resolve Tender Document
            const orClauses = [
                { tenderNumber: tenderIdentifier },
                { tenderId: tenderIdentifier },
            ];
            if (typeof tenderIdentifier === 'string' && /^[0-9a-fA-F]{24}$/.test(tenderIdentifier)) {
                orClauses.push({ _id: tenderIdentifier });
            }
            const tenderDoc = (await Tender_1.Tender.findOne({ $or: orClauses })) || (await Tender_1.Tender.findOne());
            const tenderDbId = tenderDoc?.id || tenderDoc?._id?.toString() || tenderIdentifier;
            const tenderNumber = tenderDoc?.tenderNumber || tenderDoc?.tenderId || tenderIdentifier;
            existingBid = await Bid_1.Bid.create({
                tenderId: tenderDbId,
                tenderNumber,
                bidderId: `bidder-${Date.now()}`,
                bidderName,
                status: 'PENDING',
                submittedAt: new Date(),
                documents: [],
                verifications: [],
                clarifications: [],
            });
        }
        const bidId = existingBid._id.toString();
        // If documents were passed in, ensure they are stored under this bidId
        if (input.documents && input.documents.length > 0) {
            for (const d of input.documents) {
                const existingDoc = await Document_1.DocumentModel.findOne({
                    bidId,
                    documentType: d.documentType,
                });
                if (!existingDoc) {
                    await Document_1.DocumentModel.create({
                        bidId,
                        fileName: d.name,
                        name: d.name,
                        fileType: d.mimeType,
                        mimeType: d.mimeType,
                        fileSize: d.sizeBytes,
                        sizeBytes: d.sizeBytes,
                        sha256: d.sha256Hash,
                        sha256Hash: d.sha256Hash,
                        documentType: d.documentType,
                        processingStatus: 'PROCESSED',
                        extractionMethod: d.extractionMethod || 'TEXT',
                        extractedText: d.extractedText || '',
                        extractedFields: d.extractedFields || {},
                    });
                }
            }
        }
        return this.runVerificationForBid(bidId);
    }
}
exports.VerificationService = VerificationService;
exports.verificationService = new VerificationService();
exports.default = exports.verificationService;
