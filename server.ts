import app from './app';
import { connectToDatabase } from './db/mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '../.env' }); // Load from root for now

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
