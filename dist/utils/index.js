"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeString = sanitizeString;
function sanitizeString(val) {
    return (val || '').trim();
}
