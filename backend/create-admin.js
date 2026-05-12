// CREATE ADMIN ACCOUNT SCRIPT
// Save this as: create-admin.js in your backend folder
// Run with: node create-admin.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/shoestore';

// User Schema (same as in server.js)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' },
    phone: String,
    address: String,
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Create Admin Function
async function createAdmin() {
    try {
        // Connect to MongoDB
        console.log('🔄 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        // Admin details
        const adminData = {
            name: 'Admin User',
            email: 'admin@shoestore.com',
            password: 'Admin123!',
            role: 'admin',
            phone: '+250788123456',
            address: 'Kigali, Rwanda'
        };

        // Check if admin already exists
        const existingAdmin = await User.findOne({ email: adminData.email });
        
        if (existingAdmin) {
            console.log('⚠️  Admin account already exists!');
            console.log('📧 Email:', existingAdmin.email);
            console.log('👤 Name:', existingAdmin.name);
            console.log('🔑 Role:', existingAdmin.role);
            
            // Update to admin if not already
            if (existingAdmin.role !== 'admin') {
                existingAdmin.role = 'admin';
                await existingAdmin.save();
                console.log('✅ Updated role to admin!');
            }
        } else {
            // Hash password
            console.log('🔐 Hashing password...');
            const hashedPassword = await bcrypt.hash(adminData.password, 10);

            // Create admin user
            console.log('👤 Creating admin account...');
            const admin = new User({
                ...adminData,
                password: hashedPassword
            });

            await admin.save();
            console.log('✅ Admin account created successfully!\n');
        }

        // Display credentials
        console.log('═══════════════════════════════════════');
        console.log('📋 ADMIN LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log('📧 Email:    admin@shoestore.com');
        console.log('🔑 Password: Admin123!');
        console.log('🌐 Login at: http://localhost:3000/login.html');
        console.log('═══════════════════════════════════════\n');
        console.log('⚠️  IMPORTANT: Change password after first login!\n');

        // Verify all users
        const allUsers = await User.find();
        console.log('👥 All users in database:');
        allUsers.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} - Role: ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Database connection closed');
        process.exit(0);
    }
}

// Run the script
createAdmin();