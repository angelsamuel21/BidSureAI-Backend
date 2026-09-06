"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sandboxGateway = exports.GovernmentSandboxGateway = exports.mlServiceAdapter = exports.MLServiceAdapter = exports.MakeInIndiaAdapter = exports.DebarmentAdapter = exports.MCAAdapter = exports.UdyamAdapter = exports.PANAdapter = exports.GSTNAdapter = void 0;
const gstn_1 = require("./gstn");
Object.defineProperty(exports, "GSTNAdapter", { enumerable: true, get: function () { return gstn_1.GSTNAdapter; } });
const pan_1 = require("./pan");
Object.defineProperty(exports, "PANAdapter", { enumerable: true, get: function () { return pan_1.PANAdapter; } });
const udyam_1 = require("./udyam");
Object.defineProperty(exports, "UdyamAdapter", { enumerable: true, get: function () { return udyam_1.UdyamAdapter; } });
const mca21_1 = require("./mca21");
Object.defineProperty(exports, "MCAAdapter", { enumerable: true, get: function () { return mca21_1.MCAAdapter; } });
const debarment_1 = require("./debarment");
Object.defineProperty(exports, "DebarmentAdapter", { enumerable: true, get: function () { return debarment_1.DebarmentAdapter; } });
const mii_1 = require("./mii");
Object.defineProperty(exports, "MakeInIndiaAdapter", { enumerable: true, get: function () { return mii_1.MakeInIndiaAdapter; } });
const mlServiceAdapter_1 = require("./mlServiceAdapter");
Object.defineProperty(exports, "MLServiceAdapter", { enumerable: true, get: function () { return mlServiceAdapter_1.MLServiceAdapter; } });
Object.defineProperty(exports, "mlServiceAdapter", { enumerable: true, get: function () { return mlServiceAdapter_1.mlServiceAdapter; } });
class GovernmentSandboxGateway {
    gstAdapter = new gstn_1.GSTNAdapter();
    panAdapter = new pan_1.PANAdapter();
    udyamAdapter = new udyam_1.UdyamAdapter();
    mcaAdapter = new mca21_1.MCAAdapter();
    debarmentAdapter = new debarment_1.DebarmentAdapter();
    miiAdapter = new mii_1.MakeInIndiaAdapter();
    async verifyAll(params) {
        const results = {};
        // 1. Debarment Check (Highest Priority)
        results.debarment = await this.debarmentAdapter.verify(params.legalName);
        // 2. GSTN Verification
        if (params.gstin) {
            results.gst = await this.gstAdapter.verify(params.gstin, { expectedLegalName: params.legalName });
        }
        // 3. PAN Verification
        if (params.pan) {
            results.pan = await this.panAdapter.verify(params.pan, {
                expectedLegalName: params.legalName,
                linkedGstin: params.gstin,
            });
        }
        // 4. Udyam Verification
        if (params.udyamNumber) {
            results.udyam = await this.udyamAdapter.verify(params.udyamNumber, { expectedLegalName: params.legalName });
        }
        // 5. MCA Verification
        if (params.cin) {
            results.mca = await this.mcaAdapter.verify(params.cin, { expectedLegalName: params.legalName });
        }
        // 6. Make in India Local Content Verification
        if (params.claimedLocalContentPercent !== undefined) {
            results.mii = await this.miiAdapter.verify(params.claimedLocalContentPercent.toString(), {
                minRequiredPercent: params.minLocalContentPercent ?? 50,
                oemDeclaredPercent: params.oemLocalContentPercent,
            });
        }
        return results;
    }
}
exports.GovernmentSandboxGateway = GovernmentSandboxGateway;
exports.sandboxGateway = new GovernmentSandboxGateway();
exports.default = exports.sandboxGateway;
