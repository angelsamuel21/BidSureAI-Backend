"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectToDatabase = connectToDatabase;
const mongoose_1 = __importDefault(require("mongoose"));
const dns_1 = __importDefault(require("dns"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables regardless of where the app was launched
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
dotenv_1.default.config();
// On Windows, Node's default DNS resolver frequently fails on SRV lookups (querySrv ECONNREFUSED)
if (process.platform === 'win32' || process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
    try {
        dns_1.default.setServers(['8.8.8.8', '1.1.1.1']);
    }
    catch {
        // Ignore if not permitted
    }
}
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
