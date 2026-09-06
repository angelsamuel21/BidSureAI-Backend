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
exports.ComplianceResult = exports.ComplianceResultSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.ComplianceResultSchema = new mongoose_1.Schema({
    bidId: { type: String, required: true, unique: true, index: true },
    score: { type: Number, required: true },
    overallScore: { type: Number },
    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        required: true,
        index: true,
    },
    status: {
        type: String,
        enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
        required: true,
    },
    recommendation: {
        type: String,
        enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
    },
    summary: { type: String },
    aiSummary: { type: String },
    riskFactors: [{ type: String }],
    ruleResults: { type: mongoose_1.Schema.Types.Mixed },
    portalVerifications: { type: mongoose_1.Schema.Types.Mixed },
    aiFindings: { type: mongoose_1.Schema.Types.Mixed },
    evaluatedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            if (!ret.overallScore && ret.score !== undefined)
                ret.overallScore = ret.score;
            if (!ret.score && ret.overallScore !== undefined)
                ret.score = ret.overallScore;
            if (!ret.recommendation && ret.status)
                ret.recommendation = ret.status;
            if (!ret.status && ret.recommendation)
                ret.status = ret.recommendation;
            if (!ret.aiSummary && ret.summary)
                ret.aiSummary = ret.summary;
            if (!ret.summary && ret.aiSummary)
                ret.summary = ret.aiSummary;
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
exports.ComplianceResultSchema.pre('save', function () {
    if (this.overallScore === undefined && this.score !== undefined)
        this.overallScore = this.score;
    if (this.score === undefined && this.overallScore !== undefined)
        this.score = this.overallScore;
    if (!this.recommendation && this.status)
        this.recommendation = this.status;
    if (!this.status && this.recommendation)
        this.status = this.recommendation;
    if (!this.aiSummary && this.summary)
        this.aiSummary = this.summary;
    if (!this.summary && this.aiSummary)
        this.summary = this.aiSummary;
});
exports.ComplianceResult = mongoose_1.default.models.ComplianceResult || mongoose_1.default.model('ComplianceResult', exports.ComplianceResultSchema);
exports.default = exports.ComplianceResult;
