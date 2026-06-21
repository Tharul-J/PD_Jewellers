import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './server/models/User.js';
import Product from './server/models/Product.js';
import { MOCK_PRODUCTS } from './src/data/products.js';

dotenv.config();

const connectDB = async () => {
  const conn = await mongoose.connect(process.env.MONGODB_URI as string);
  console.log(`MongoDB Connected: ${conn.connection.host}`);
};

const importData = async () => {
  try {
    await connectDB();

    await User.deleteMany();
    await Product.deleteMany();

    const usersData = [
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

    // Use .save() (not insertMany) so the pre('save') bcrypt hook fires
    for (const userData of usersData) {
      await new User(userData).save();
    }
    await Product.insertMany(MOCK_PRODUCTS);

    console.log(`Users seeded: ${usersData.length}`);
    console.log(`Products seeded: ${MOCK_PRODUCTS.length}`);
    console.log('Data Imported!');
    process.exit();
  } catch (error) {
    console.error(`Error: ${error}`);
    process.exit(1);
  }
};

importData();
