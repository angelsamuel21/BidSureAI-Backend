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
exports.Bid = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const Document_1 = require("./Document");
const Verification_1 = require("./Verification");
const Clarification_1 = require("./Clarification");
const OfficerDecisionSchema = new mongoose_1.Schema({
    decision: {
        type: String,
        enum: ['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT'],
        required: true,
    },
    justification: { type: String, required: true },
    overrideReason: { type: String },
    officerName: { type: String, required: true },
    officerRole: {
        type: String,
        enum: ['PROCUREMENT_OFFICER', 'VIGILANCE_AUDITOR', 'SYSTEM_ADMIN'],
        default: 'PROCUREMENT_OFFICER',
    },
    timestamp: { type: Date, default: Date.now },
}, { _id: false });
const EvaluationSchema = new mongoose_1.Schema({
    id: { type: String },
    bidId: { type: String },
    overallScore: { type: Number, required: true },
    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        required: true,
    },
    riskFactors: [{ type: String }],
    recommendation: {
        type: String,
        enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
        required: true,
    },
    aiSummary: { type: String },
    ruleResults: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    aiFindings: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    portalVerifications: { type: [mongoose_1.Schema.Types.Mixed], default: [] },
    evaluatedAt: { type: Date, default: Date.now },
}, { _id: false });
const BidSchema = new mongoose_1.Schema({
    tenderId: { type: String, required: true, index: true },
    tenderNumber: { type: String, index: true },
    bidderId: { type: String, required: true, index: true },
    bidderName: { type: String, required: true, trim: true, index: true },
    status: {
        type: String,
        enum: ['PENDING', 'EVALUATED', 'CLARIFICATION_REQUESTED', 'QUALIFIED', 'DISQUALIFIED'],
        default: 'PENDING',
        index: true,
    },
    submittedAt: { type: Date, default: Date.now },
    complianceScore: { type: Number },
    riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    },
    recommendation: {
        type: String,
        enum: ['COMPLIANT', 'REQUIRES_MANUAL_REVIEW', 'NON-COMPLIANT'],
    },
    decision: {
        type: String,
        enum: ['APPROVE', 'REQUEST_CLARIFICATION', 'REJECT'],
    },
    decisionReason: { type: String },
    officerName: { type: String },
    officerRole: { type: String },
    decisionTime: { type: Date },
    overrideReason: { type: String },
    officerDecision: { type: OfficerDecisionSchema },
    evaluation: { type: EvaluationSchema },
    documents: [Document_1.DocumentSchema],
    verifications: [Verification_1.VerificationSchema],
    clarifications: [Clarification_1.ClarificationSchema],
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
BidSchema.index({ tenderId: 1, bidderId: 1 });
exports.Bid = mongoose_1.default.models.Bid || mongoose_1.default.model('Bid', BidSchema);
exports.default = exports.Bid;
