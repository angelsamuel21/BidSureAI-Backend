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
exports.Tender = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const TenderRequirement_1 = require("./TenderRequirement");
const TenderSchema = new mongoose_1.Schema({
    tenderNumber: { type: String, required: true, unique: true, trim: true, index: true },
    tenderId: { type: String, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    department: { type: String, default: 'Chennai Petroleum Corporation Limited (CPCL)' },
    estimatedValueCr: { type: Number, default: 1.0 },
    submissionDeadline: { type: Date },
    status: { type: String, default: 'ACTIVE', index: true },
    requirements: [TenderRequirement_1.TenderRequirementSchema],
}, {
    timestamps: true,
    toJSON: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            if (!ret.tenderId && ret.tenderNumber)
                ret.tenderId = ret.tenderNumber;
            if (!ret.tenderNumber && ret.tenderId)
                ret.tenderNumber = ret.tenderId;
            delete ret._id;
            delete ret.__v;
            return ret;
        },
    },
    toObject: {
        virtuals: true,
        transform: (_doc, ret) => {
            ret.id = ret._id.toString();
            if (!ret.tenderId && ret.tenderNumber)
                ret.tenderId = ret.tenderNumber;
            if (!ret.tenderNumber && ret.tenderId)
                ret.tenderNumber = ret.tenderId;
            return ret;
        },
    },
});
// Pre-save hook to ensure tenderId and tenderNumber stay in sync
TenderSchema.pre('save', function () {
    if (!this.tenderId && this.tenderNumber) {
        this.tenderId = this.tenderNumber;
    }
    else if (!this.tenderNumber && this.tenderId) {
        this.tenderNumber = this.tenderId;
    }
});
exports.Tender = mongoose_1.default.models.Tender || mongoose_1.default.model('Tender', TenderSchema);
exports.default = exports.Tender;
