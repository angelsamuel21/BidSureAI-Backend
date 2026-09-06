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
exports.Clarification = exports.ClarificationSchema = void 0;
const mongoose_1 = __importStar(require("mongoose"));
exports.ClarificationSchema = new mongoose_1.Schema({
    bidId: { type: String, required: true, index: true },
    tenderId: { type: String },
    requirementId: { type: String },
    issue: { type: String },
    clauseRef: { type: String },
    clauseReference: { type: String },
    message: { type: String, required: true },
    queryText: { type: String },
    deadline: { type: Date },
    status: {
        type: String,
        enum: ['PENDING_RESPONSE', 'RESOLVED', 'OVERDUE'],
        default: 'PENDING_RESPONSE',
    },
    responseNotes: { type: String },
    issuedBy: { type: String },
    issuedAt: { type: Date, default: Date.now },
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            if (!ret.clauseReference && ret.clauseRef)
                ret.clauseReference = ret.clauseRef;
            if (!ret.clauseRef && ret.clauseReference)
                ret.clauseRef = ret.clauseReference;
            if (!ret.queryText && ret.message)
                ret.queryText = ret.message;
            if (!ret.message && ret.queryText)
                ret.message = ret.queryText;
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
exports.ClarificationSchema.pre('save', function () {
    if (!this.clauseReference && this.clauseRef)
        this.clauseReference = this.clauseRef;
    if (!this.clauseRef && this.clauseReference)
        this.clauseRef = this.clauseReference;
    if (!this.queryText && this.message)
        this.queryText = this.message;
    if (!this.message && this.queryText)
        this.message = this.queryText;
});
exports.Clarification = mongoose_1.default.models.Clarification || mongoose_1.default.model('Clarification', exports.ClarificationSchema);
exports.default = exports.Clarification;
