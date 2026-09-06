"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const mongodb_1 = require("./db/mongodb");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '../.env' }); // Load from root for now
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
