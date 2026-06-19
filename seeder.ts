import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';

dotenv.config();

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI as string);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const importData = async () => {
  try {
    await connectDB();

    await User.deleteMany();

    const users = [
      {
        name: 'Admin User',
        email: 'admin@pdjewellers.com',
        password: 'password123',
        role: 'administrator'
      },
      {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123',
        role: 'customer'
      }
    ];

    await User.insertMany(users);

    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
