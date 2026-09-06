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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentModel = exports.DocumentSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.DocumentSchema = new mongoose_1.Schema({
    bidId: { type: String, required: true, index: true },
    fileName: { type: String, required: true, trim: true },
    name: { type: String, trim: true },
    fileType: { type: String },
    mimeType: { type: String },
    fileSize: { type: Number },
    sizeBytes: { type: Number },
    storagePath: { type: String },
    sha256: { type: String, trim: true },
    sha256Hash: { type: String, trim: true },
    documentType: { type: String },
    processingStatus: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED'],
        default: 'PROCESSED',
    },
    extractionMethod: {
        type: String,
        enum: ['TEXT', 'OCR', 'MIXED', 'FAILED'],
        default: 'TEXT',
    },
    extractedText: { type: String },
    extractedFields: { type: mongoose_1.Schema.Types.Mixed },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            if (!ret.name && ret.fileName)
                ret.name = ret.fileName;
            if (!ret.fileName && ret.name)
                ret.fileName = ret.name;
            if (!ret.sha256Hash && ret.sha256)
                ret.sha256Hash = ret.sha256;
            if (!ret.sha256 && ret.sha256Hash)
                ret.sha256 = ret.sha256Hash;
            if (!ret.sizeBytes && ret.fileSize)
                ret.sizeBytes = ret.fileSize;
            if (!ret.fileSize && ret.sizeBytes)
                ret.fileSize = ret.sizeBytes;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            return ret;
        },
    },
});
// Pre-save alias sync
exports.DocumentSchema.pre('save', function () {
    if (!this.name && this.fileName)
        this.name = this.fileName;
    if (!this.fileName && this.name)
        this.fileName = this.name;
    if (!this.sha256Hash && this.sha256)
        this.sha256Hash = this.sha256;
    if (!this.sha256 && this.sha256Hash)
        this.sha256 = this.sha256Hash;
    if (!this.sizeBytes && this.fileSize)
        this.sizeBytes = this.fileSize;
    if (!this.fileSize && this.sizeBytes)
        this.fileSize = this.sizeBytes;
});
exports.DocumentModel = mongoose_1.default.models.Document || mongoose_1.default.model('Document', exports.DocumentSchema);
exports.default = exports.DocumentModel;
