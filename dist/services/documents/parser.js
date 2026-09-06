"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseDocumentBuffer = parseDocumentBuffer;
const crypto_1 = __importDefault(require("crypto"));
const extractor_1 = require("./extractor");
const adapters_1 = require("../../adapters");
async function parseDocumentBuffer(buffer, fileName, mimeType) {
    // 1. Calculate Cryptographic SHA-256 Hash for Document Integrity
    const sha256Hash = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
    let rawText = '';
    let mlFields = {};
    let extractionMethod = 'TEXT';
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isImage = mimeType.startsWith('image/') || /\.(png|jpe?g)$/i.test(fileName);
    const isText = mimeType.startsWith('text/') || fileName.toLowerCase().endsWith('.txt');
    // 2. Extract Text based on Document Format
    if (isPdf || isImage) {
        // Strategy A: Call Python MLService (PyMuPDF for text PDF, Tesseract for scanned/image)
        try {
            const mlExtracted = await adapters_1.mlServiceAdapter.extractDocument(buffer, fileName, mimeType);
            if (mlExtracted && mlExtracted.text) {
                rawText = mlExtracted.text;
                extractionMethod = mlExtracted.method || (isImage ? 'OCR' : 'TEXT');
                if (mlExtracted.fields) {
                    if (mlExtracted.fields.company_name)
                        mlFields.legalName = mlExtracted.fields.company_name;
                    if (mlExtracted.fields.gstin)
                        mlFields.gstin = mlExtracted.fields.gstin;
                    if (mlExtracted.fields.pan)
                        mlFields.pan = mlExtracted.fields.pan;
                    if (mlExtracted.fields.udyam)
                        mlFields.udyamNumber = mlExtracted.fields.udyam;
                    if (mlExtracted.fields.cin)
                        mlFields.cin = mlExtracted.fields.cin;
                    if (mlExtracted.fields.turnover !== null && mlExtracted.fields.turnover !== undefined) {
                        mlFields.turnoverCr = mlExtracted.fields.turnover;
                    }
                    if (mlExtracted.fields.experience !== null && mlExtracted.fields.experience !== undefined) {
                        mlFields.experienceYears = mlExtracted.fields.experience;
                    }
                }
            }
        }
        catch {
            // Fallback if ML service is unreachable
        }
        // Strategy B: Fallback to Node.js pdf-parse for native text PDFs if ML service did not return text
        if (!rawText && isPdf) {
            try {
                const pdfModule = await Promise.resolve().then(() => __importStar(require('pdf-parse')));
                const pdfParse = pdfModule.default || pdfModule;
                const pdfData = await pdfParse(buffer);
                rawText = pdfData.text || '';
                if (rawText.trim()) {
                    extractionMethod = 'TEXT';
                }
            }
            catch {
                rawText = '';
            }
        }
        // If still no text extracted for an image or scanned document
        if (!rawText.trim()) {
            extractionMethod = 'FAILED';
        }
    }
    else if (isText) {
        rawText = buffer.toString('utf-8');
        extractionMethod = 'TEXT';
    }
    else {
        extractionMethod = 'FAILED';
    }
    // 3. Extract Statutory Entities & Classify Document
    const { entities, classifiedType } = extractor_1.entityExtractor.extractFromText(rawText, fileName);
    const mergedEntities = { ...entities, ...mlFields };
    return {
        fileName,
        mimeType,
        sizeBytes: buffer.length,
        sha256Hash,
        rawText,
        extractionMethod,
        extractedEntities: mergedEntities,
        documentType: classifiedType,
    };
}
exports.default = parseDocumentBuffer;
