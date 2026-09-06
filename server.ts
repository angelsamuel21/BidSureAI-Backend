import dotenv from 'dotenv';
import path from 'path';

// Load environment variables early from local or root .env
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import app from './app';
import { connectToDatabase } from './db/mongodb';

const PORT = process.env.PORT || 5001;

async function startServer() {
  try {
    await connectToDatabase();
    console.log('MongoDB connected successfully');

  } catch (error) {
    console.error('Failed to connect to MongoDB initially. Will use memory fallback where possible. Error:', error);
  }
  
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Start BIDSHIELD AI backend server
startServer();
