"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const mongodb_1 = require("../db/mongodb");
const Bid_1 = require("../models/Bid");
const Document_1 = require("../models/Document");
const parser_1 = require("../services/documents/parser");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../services/audit");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});
const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
// POST /api/documents/:bidId — Upload documents for a bid
router.post('/:bidId', auth_1.requireAuth, upload.array('files'), async (req, res) => {
    try {
        const bidId = req.params.bidId;
        const documentType = req.body.type || req.body.documentType;
        await (0, mongodb_1.connectToDatabase)();
        const bid = await Bid_1.Bid.findById(bidId);
        if (!bid) {
            return res.status(404).json({ success: false, message: 'Bid not found', error: 'BID_NOT_FOUND' });
        }
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, message: 'No files provided', error: 'NO_FILES' });
        }
        const uploadedDocs = [];
        for (const file of files) {
            // Validate file type
            if (!allowedMimes.includes(file.mimetype) && !file.originalname.endsWith('.pdf')) {
                return res.status(400).json({
                    success: false,
                    message: `Unsupported file type for "${file.originalname}". Allowed formats: PDF, JPG, PNG.`,
                    error: 'INVALID_FILE_TYPE',
                });
            }
            // Parse document — extract SHA-256 and statutory entities
            const parsed = await (0, parser_1.parseDocumentBuffer)(file.buffer, file.originalname, file.mimetype);
            const targetDocType = documentType || parsed.documentType;
            // When replacing a document of the same type for this bid, remove stale prior records
            if (targetDocType) {
                await Document_1.DocumentModel.deleteMany({ bidId, documentType: targetDocType });
                bid.documents = (bid.documents || []).filter((d) => d.documentType !== targetDocType);
            }
            const processingStatus = (parsed.extractionMethod === 'FAILED' && !parsed.rawText) ? 'FAILED' : 'PROCESSED';
            const extractionMethod = parsed.extractionMethod || 'TEXT';
            // Create document record in standalone collection
            const docRecord = await Document_1.DocumentModel.create({
                bidId,
                fileName: file.originalname,
                name: file.originalname,
                fileType: file.mimetype,
                mimeType: file.mimetype,
                fileSize: file.size,
                sizeBytes: file.size,
                sha256: parsed.sha256Hash,
                sha256Hash: parsed.sha256Hash,
                documentType: targetDocType,
                processingStatus,
                extractionMethod,
                extractedText: parsed.rawText.substring(0, 3000),
                extractedFields: parsed.extractedEntities,
            });
            // Also push into bid's embedded documents array
            bid.documents.push({
                bidId,
                fileName: file.originalname,
                name: file.originalname,
                fileType: file.mimetype,
                mimeType: file.mimetype,
                fileSize: file.size,
                sizeBytes: file.size,
                sha256: parsed.sha256Hash,
                sha256Hash: parsed.sha256Hash,
                documentType: targetDocType,
                processingStatus,
                extractionMethod,
                extractedText: parsed.rawText.substring(0, 3000),
                extractedFields: parsed.extractedEntities,
            });
            uploadedDocs.push({
                id: docRecord._id.toString(),
                name: file.originalname,
                fileName: file.originalname,
                sizeBytes: file.size,
                mimeType: file.mimetype,
                sha256Hash: parsed.sha256Hash,
                documentType: targetDocType,
                uploadedAt: docRecord.createdAt?.toISOString() || new Date().toISOString(),
                processingStatus,
                extractionMethod,
                extractedText: parsed.rawText.substring(0, 3000),
                extractedFields: parsed.extractedEntities,
            });
        }
        await bid.save();
        await audit_1.auditService.log({
            actor: req.user?.name || 'System',
            role: req.user?.role || 'PROCUREMENT_OFFICER',
            action: 'DOCUMENT_UPLOADED',
            bidId,
            details: `${uploadedDocs.length} document(s) uploaded for bid ${bidId}: ${uploadedDocs.map(d => d.name).join(', ')}`,
        });
        return res.json({
            success: true,
            data: uploadedDocs,
            message: `Successfully processed ${uploadedDocs.length} documents.`,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: 'UPLOAD_FAILED' });
    }
});
// GET /api/documents/:bidId — List documents for a bid
router.get('/:bidId', auth_1.requireAuth, async (req, res) => {
    try {
        const { bidId } = req.params;
        await (0, mongodb_1.connectToDatabase)();
        // Try standalone collection first
        const docs = await Document_1.DocumentModel.find({ bidId }).lean();
        if (docs && docs.length > 0) {
            const mapped = docs.map((d) => ({
                id: d._id.toString(),
                bidId: d.bidId,
                name: d.name || d.fileName,
                fileName: d.fileName || d.name,
                sizeBytes: d.sizeBytes || d.fileSize,
                mimeType: d.mimeType || d.fileType,
                sha256Hash: d.sha256Hash || d.sha256,
                documentType: d.documentType,
                processingStatus: d.processingStatus || 'PROCESSED',
                extractionMethod: d.extractionMethod || 'TEXT',
                uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
                extractedText: d.extractedText,
                extractedFields: d.extractedFields || {},
            }));
            return res.json({ success: true, data: mapped });
        }
        // Fallback: check embedded docs in bid
        const bid = await Bid_1.Bid.findById(bidId).lean();
        if (bid && bid.documents?.length > 0) {
            const mapped = bid.documents.map((d) => ({
                id: d._id?.toString() || d.id || `doc-${Date.now()}`,
                bidId,
                name: d.name || d.fileName,
                fileName: d.fileName || d.name,
                sizeBytes: d.sizeBytes || d.fileSize,
                mimeType: d.mimeType || d.fileType,
                sha256Hash: d.sha256Hash || d.sha256,
                documentType: d.documentType,
                processingStatus: d.processingStatus || 'PROCESSED',
                extractionMethod: d.extractionMethod || 'TEXT',
                uploadedAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
                extractedText: d.extractedText,
                extractedFields: d.extractedFields || {},
            }));
            return res.json({ success: true, data: mapped });
        }
        return res.json({ success: true, data: [] });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message, error: 'FETCH_FAILED' });
    }
});
exports.default = router;
