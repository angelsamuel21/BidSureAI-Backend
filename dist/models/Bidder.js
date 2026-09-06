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
exports.Bidder = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const BidderSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true, index: true },
    legalName: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    pan: { type: String, trim: true, uppercase: true, index: true },
    gstin: { type: String, trim: true, uppercase: true, index: true },
    udyamNumber: { type: String, trim: true },
    address: { type: String },
    category: {
        type: String,
        enum: ['MICRO', 'SMALL', 'MEDIUM', 'LARGE'],
        default: 'MICRO',
    },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    isDebarred: { type: Boolean, default: false, index: true },
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
exports.Bidder = mongoose_1.default.models.Bidder || mongoose_1.default.model('Bidder', BidderSchema);
exports.default = exports.Bidder;
