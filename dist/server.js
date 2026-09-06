"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables early from local or root .env
dotenv_1.default.config();
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app_1 = __importDefault(require("./app"));
const mongodb_1 = require("./db/mongodb");
const PORT = process.env.PORT || 5001;
async function startServer() {
    try {
        await (0, mongodb_1.connectToDatabase)();
        console.log('MongoDB connected successfully');
    }
    catch (error) {
        console.error('Failed to connect to MongoDB initially. Will use memory fallback where possible. Error:', error);
    }
    app_1.default.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}
// Start BIDSHIELD AI backend server
startServer();
