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
exports.Verification = exports.VerificationSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.VerificationSchema = new mongoose_1.Schema({
    bidId: { type: String, required: true, index: true },
    requirementId: { type: String },
    ruleId: { type: String },
    ruleName: { type: String },
    category: { type: String },
    status: {
        type: String,
        enum: ['PASS', 'FAIL', 'WARNING', 'PENDING', 'MANUAL_REVIEW', 'NOT_APPLICABLE'],
        default: 'PASS',
        index: true,
    },
    source: {
        type: String,
        default: 'PORTAL_SANDBOX',
    },
    verificationMethod: { type: String },
    verificationStatusLabel: { type: String },
    failureReason: { type: String },
    documentName: { type: String },
    isCritical: { type: Boolean, default: false },
    extractedValue: { type: mongoose_1.Schema.Types.Mixed },
    verifiedValue: { type: mongoose_1.Schema.Types.Mixed },
    explanation: { type: String },
    evidence: { type: String },
    score: { type: Number, default: 100 },
    confidence: { type: Number, default: 0.95 },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
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
exports.Verification = mongoose_1.default.models.Verification || mongoose_1.default.model('Verification', exports.VerificationSchema);
exports.default = exports.Verification;
