"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const parser_1 = require("../services/documents/parser");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15MB limit
});
router.post('/', upload.array('files'), async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({ success: false, error: 'No files provided.' });
        }
        const uploadedDocs = [];
        const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'text/plain'];
        for (const file of files) {
            if (!allowedMimes.includes(file.mimetype) && !file.originalname.endsWith('.pdf')) {
                return res.status(400).json({
                    success: false,
                    error: `Unsupported file type for "${file.originalname}". Allowed formats: PDF, JPG, PNG.`,
                });
            }
            // Parse document, extract SHA-256 and statutory entities
            const parsed = await (0, parser_1.parseDocumentBuffer)(file.buffer, file.originalname, file.mimetype);
            const doc = {
                id: `doc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: file.originalname,
                sizeBytes: file.size,
                mimeType: file.mimetype || 'application/pdf',
                sha256Hash: parsed.sha256Hash,
                documentType: parsed.documentType,
                uploadedAt: new Date().toISOString(),
                extractedText: parsed.rawText.substring(0, 3000), // First 3000 chars snippet
                extractedFields: parsed.extractedEntities,
            };
            uploadedDocs.push(doc);
        }
        return res.json({
            success: true,
            documents: uploadedDocs,
            message: `Successfully processed ${uploadedDocs.length} documents. SHA-256 integrity calculated.`,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, error: error.message });
    }
});
exports.default = router;
