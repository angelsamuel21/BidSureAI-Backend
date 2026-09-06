"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
/**
 * MongoDB Atlas Connection Manager with Connection Caching for Next.js
 */
const MONGODB_URI = process.env.MONGODB_URI;
let cached = global.mongooseCache;
if (!cached) {
    cached = global.mongooseCache = { conn: null, promise: null };
}
async function connectToDatabase() {
    const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/gem_compliance';
    if (cached.conn) {
        return cached.conn;
    }
    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
            serverSelectionTimeoutMS: 2500,
        };
        cached.promise = mongoose_1.default.connect(uri, opts).then((m) => {
            return m;
        });
    }
    try {
        cached.conn = await cached.promise;
    }
    catch (e) {
        cached.promise = null;
        throw e;
    }
    return cached.conn;
}
exports.default = connectToDatabase;
