const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// User Schema (same as in server.js)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Admin credentials - CHANGE THESE!
const ADMIN_EMAIL = 'admin@shoestore.com';
const ADMIN_PASSWORD = 'YourNewPassword123!';  // ← CHANGE THIS!

const SELLER_EMAIL = 'seller@shoestore.com';
const SELLER_PASSWORD = 'SellerPassword123!';  // ← CHANGE THIS!

async function seedAdmin() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Create Admin
        const adminExists = await User.findOne({ email: ADMIN_EMAIL });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
            await User.create({
                name: 'Admin User',
                email: ADMIN_EMAIL,
                password: hashedPassword,
                role: 'admin'
            });
            console.log('✅ Admin account created:', ADMIN_EMAIL);
        } else {
            console.log('⚠️  Admin already exists');
        }

        // Create Seller
        const sellerExists = await User.findOne({ email: SELLER_EMAIL });
        if (!sellerExists) {
            const hashedPassword = await bcrypt.hash(SELLER_PASSWORD, 10);
            await User.create({
                name: 'Seller User',
                email: SELLER_EMAIL,
                password: hashedPassword,
                role: 'seller'
            });
            console.log('✅ Seller account created:', SELLER_EMAIL);
        } else {
            console.log('⚠️  Seller already exists');
        }

        console.log('✅ Seeding complete!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

seedAdmin();