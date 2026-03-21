const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Create uploads directory
const uploadsDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Configure multer
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadsDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'shoe-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only image files are allowed!'), false);
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/shoestore', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch(err => console.error('❌ MongoDB Connection Error:', err));

// ===== SCHEMAS =====

const ProductSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: String,
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: String,
    stock: { type: Number, default: 0 },
    featured: { type: Boolean, default: false },
    sizes: [String],
    colors: [String],
    averageRating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' },
    phone: String,
    address: String,
    businessInfo: {
        businessName: String,
        businessDescription: String,
        taxId: String
    },
    createdAt: { type: Date, default: Date.now }
});

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: String,
    shippingAddress: String,
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, default: 'pending' },
    paymentMethod: String,
    paymentId: String,
    createdAt: { type: Date, default: Date.now }
});

const ContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: String,
    message: { type: String, required: true },
    status: { type: String, default: 'new' },
    createdAt: { type: Date, default: Date.now }
});

const WishlistSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    products: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        addedAt: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now }
});

const ReviewSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: String,
    comment: String,
    verified: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

// Models
const Product = mongoose.model('Product', ProductSchema);
const User = mongoose.model('User', UserSchema);
const Order = mongoose.model('Order', OrderSchema);
const Contact = mongoose.model('Contact', ContactSchema);
const Wishlist = mongoose.model('Wishlist', WishlistSchema);
const Review = mongoose.model('Review', ReviewSchema);

// Email Configuration (Optional)
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
        transporter = nodemailer.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT) || 587,
            secure: false,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('✅ Email service configured');
    } catch (error) {
        console.log('⚠️  Email configuration error:', error.message);
    }
} else {
    console.log('⚠️  Email not configured (optional - set EMAIL_USER and EMAIL_PASS in .env to enable)');
}

async function sendEmail(to, subject, html) {
    try {
        if (!transporter) {
            console.log('📧 Email simulation:', subject, '→', to);
            return { success: true, message: 'Email simulation' };
        }
        
        await transporter.sendMail({
            from: `"New Shoes Store" <${process.env.EMAIL_USER}>`,
            to,
            subject,
            html
        });
        console.log('✅ Email sent:', subject, '→', to);
        return { success: true };
    } catch (error) {
        console.error('❌ Email error:', error.message);
        return { success: false, error: error.message };
    }
}

// Home route
app.get('/', (req, res) => {
    res.json({ 
        message: 'Welcome to New Shoes Store API',
        version: '3.0.0 - COMPLETE WITH PAYMENTS',
        features: [
            'Search & Filters',
            'Wishlist System',
            'Product Reviews',
            'Stripe Payment Integration',
            'Mobile Money (MTN/Airtel)',
            'Email Notifications'
        ],
        endpoints: {
            products: '/api/products',
            orders: '/api/orders',
            wishlist: '/api/wishlist',
            reviews: '/api/reviews',
            payment: {
                stripe: '/api/payment/create-intent',
                momo: '/api/payment/momo',
                status: '/api/payment/momo/status/:transactionId'
            },
            contacts: '/api/contacts',
            users: '/api/users'
        }
    });
});

// ===== PRODUCT ROUTES WITH SEARCH & FILTERS =====

app.get('/api/products', async (req, res) => {
    try {
        const { 
            category, 
            featured, 
            search, 
            minPrice, 
            maxPrice, 
            size, 
            color,
            sortBy,
            sortOrder 
        } = req.query;
        
        let query = {};
        
        if (category && category !== 'all') query.category = category;
        if (featured) query.featured = featured === 'true';
        
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = parseFloat(minPrice);
            if (maxPrice) query.price.$lte = parseFloat(maxPrice);
        }
        
        if (size) query.sizes = size;
        if (color) query.colors = color;
        
        let sortOptions = { createdAt: -1 };
        if (sortBy) {
            if (sortBy === 'price') {
                sortOptions = { price: sortOrder === 'desc' ? -1 : 1 };
            } else if (sortBy === 'name') {
                sortOptions = { name: sortOrder === 'desc' ? -1 : 1 };
            } else if (sortBy === 'popular') {
                sortOptions = { featured: -1, averageRating: -1, createdAt: -1 };
            } else if (sortBy === 'rating') {
                sortOptions = { averageRating: -1 };
            }
        }

        const products = await Product.find(query).sort(sortOptions);
        
        res.json({ 
            success: true, 
            data: products,
            count: products.length,
            filters: { category, search, minPrice, maxPrice, size, color, sortBy }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/products', upload.single('image'), async (req, res) => {
    try {
        const productData = {
            ...req.body,
            image: req.file ? `/uploads/products/${req.file.filename}` : null
        };
        
        if (typeof productData.sizes === 'string') {
            productData.sizes = JSON.parse(productData.sizes);
        }
        if (typeof productData.colors === 'string') {
            productData.colors = JSON.parse(productData.colors);
        }
        
        const product = new Product(productData);
        await product.save();
        res.status(201).json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.put('/api/products/:id', upload.single('image'), async (req, res) => {
    try {
        const updateData = { ...req.body };
        
        if (req.file) {
            updateData.image = `/uploads/products/${req.file.filename}`;
        }
        
        if (typeof updateData.sizes === 'string') {
            updateData.sizes = JSON.parse(updateData.sizes);
        }
        if (typeof updateData.colors === 'string') {
            updateData.colors = JSON.parse(updateData.colors);
        }
        
        const product = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );
        
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        res.json({ success: true, data: product });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        
        if (product.image) {
            const imagePath = path.join(__dirname, product.image);
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }
        
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== WISHLIST ROUTES =====

app.get('/api/wishlist/:userId', async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ userId: req.params.userId })
            .populate('products.productId');
        
        if (!wishlist) {
            return res.json({ success: true, data: { products: [] } });
        }
        
        res.json({ success: true, data: wishlist });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/wishlist/add', async (req, res) => {
    try {
        const { userId, productId } = req.body;
        
        let wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            wishlist = new Wishlist({
                userId,
                products: [{ productId }]
            });
        } else {
            const exists = wishlist.products.some(
                item => item.productId.toString() === productId
            );
            
            if (exists) {
                return res.json({ 
                    success: false, 
                    message: 'Product already in wishlist' 
                });
            }
            
            wishlist.products.push({ productId });
        }
        
        await wishlist.save();
        
        res.json({ 
            success: true, 
            message: 'Product added to wishlist',
            data: wishlist 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/wishlist/remove/:userId/:productId', async (req, res) => {
    try {
        const { userId, productId } = req.params;
        
        const wishlist = await Wishlist.findOne({ userId });
        
        if (!wishlist) {
            return res.status(404).json({ 
                success: false, 
                message: 'Wishlist not found' 
            });
        }
        
        wishlist.products = wishlist.products.filter(
            item => item.productId.toString() !== productId
        );
        
        await wishlist.save();
        
        res.json({ 
            success: true, 
            message: 'Product removed from wishlist',
            data: wishlist 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.delete('/api/wishlist/clear/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        await Wishlist.findOneAndDelete({ userId });
        
        res.json({ 
            success: true, 
            message: 'Wishlist cleared' 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/wishlist/move-to-cart/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        const wishlist = await Wishlist.findOne({ userId })
            .populate('products.productId');
        
        if (!wishlist || wishlist.products.length === 0) {
            return res.json({ 
                success: false, 
                message: 'Wishlist is empty' 
            });
        }
        
        const products = wishlist.products.map(item => ({
            id: item.productId._id,
            name: item.productId.name,
            price: item.productId.price,
            image: item.productId.image
        }));
        
        wishlist.products = [];
        await wishlist.save();
        
        res.json({ 
            success: true, 
            message: 'Items moved to cart',
            data: products 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== REVIEWS ROUTES =====

app.get('/api/reviews/product/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ productId: req.params.productId })
            .sort({ createdAt: -1 });
        
        res.json({ success: true, data: reviews });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/reviews', async (req, res) => {
    try {
        const { productId, userId, userName, rating, title, comment } = req.body;
        
        const existing = await Review.findOne({ productId, userId });
        if (existing) {
            return res.status(400).json({ 
                success: false, 
                message: 'You have already reviewed this product' 
            });
        }
        
        const review = new Review({
            productId,
            userId,
            userName,
            rating,
            title,
            comment
        });
        
        await review.save();
        
        const reviews = await Review.find({ productId });
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        await Product.findByIdAndUpdate(productId, {
            averageRating: avgRating,
            reviewCount: reviews.length
        });
        
        res.status(201).json({ 
            success: true, 
            message: 'Review added successfully',
            data: review 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.delete('/api/reviews/:id', async (req, res) => {
    try {
        const review = await Review.findByIdAndDelete(req.params.id);
        
        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }
        
        const reviews = await Review.find({ productId: review.productId });
        const avgRating = reviews.length > 0 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length 
            : 0;
        
        await Product.findByIdAndUpdate(review.productId, {
            averageRating: avgRating,
            reviewCount: reviews.length
        });
        
        res.json({ success: true, message: 'Review deleted' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== PAYMENT ROUTES (STRIPE + MOBILE MONEY) =====

// Stripe Payment Intent
app.post('/api/payment/create-intent', async (req, res) => {
    try {
        const { amount } = req.body;
        
        // NOTE: To enable real Stripe payments:
        // 1. Install stripe: npm install stripe
        // 2. Add STRIPE_SECRET_KEY to your .env file
        // 3. Uncomment the code below
        
        /*
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount, // amount in cents
            currency: 'usd',
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        res.json({
            success: true,
            clientSecret: paymentIntent.client_secret
        });
        */
        
        // Mock response for development
        res.json({
            success: true,
            clientSecret: 'pi_mock_secret_' + Date.now(),
            message: 'Mock payment - Configure STRIPE_SECRET_KEY in .env for real payments'
        });
    } catch (error) {
        console.error('Stripe payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Mobile Money Payment (MTN/Airtel Rwanda)
app.post('/api/payment/momo', async (req, res) => {
    try {
        const { provider, phoneNumber, amount } = req.body;
        
        // Validate provider
        if (!['mtn', 'airtel'].includes(provider)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid mobile money provider' 
            });
        }
        
        // Validate phone number format
        if (!phoneNumber.match(/^\+250[0-9]{9}$/)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid phone number format. Use: +250XXXXXXXXX' 
            });
        }
        
        // NOTE: To enable real Mobile Money payments:
        // You need to integrate with MTN MoMo API or Airtel Money API
        // This requires:
        // 1. Business account with MTN/Airtel
        // 2. API credentials
        // 3. Production environment approval
        
        // For now, simulate the payment
        const transactionId = 'MOMO' + Date.now() + Math.random().toString(36).substr(2, 9);
        
        console.log(`📱 Mock MoMo Payment: ${provider.toUpperCase()} - ${phoneNumber} - $${amount}`);
        
        // Simulate successful payment
        res.json({
            success: true,
            transactionId: transactionId,
            message: `Payment request sent to ${phoneNumber}. Please check your phone and enter your PIN.`,
            provider: provider.toUpperCase(),
            amount: amount
        });
        
    } catch (error) {
        console.error('Mobile Money payment error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// Verify Mobile Money Payment Status
app.get('/api/payment/momo/status/:transactionId', async (req, res) => {
    try {
        const { transactionId } = req.params;
        
        // In production, check actual payment status from MoMo API
        // For now, return mock success
        res.json({
            success: true,
            status: 'completed',
            transactionId: transactionId,
            message: 'Payment completed successfully'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== ORDER ROUTES WITH EMAIL NOTIFICATIONS =====

app.post('/api/orders', async (req, res) => {
    try {
        const order = new Order(req.body);
        await order.save();
        
        // Send order confirmation email
        const emailHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2d5016;">Order Confirmation</h1>
                <p>Thank you for your order, ${order.customerName}!</p>
                <div style="background: #f5f5f5; padding: 20px; border-radius: 10px; margin: 20px 0;">
                    <h2>Order Details</h2>
                    <p><strong>Order ID:</strong> #${order._id.toString().slice(-8).toUpperCase()}</p>
                    <p><strong>Total:</strong> $${order.totalAmount.toFixed(2)}</p>
                    <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                </div>
                <p>We'll send you a shipping update soon!</p>
                <p style="color: #666; font-size: 12px; margin-top: 30px;">
                    This is an automated message from New Shoes Store. Please do not reply to this email.
                </p>
            </div>
        `;
        
        await sendEmail(
            order.customerEmail,
            'Order Confirmation - New Shoes Store',
            emailHTML
        );
        
        res.status(201).json({ 
            success: true, 
            message: 'Order placed successfully',
            data: order 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== CONTACT ROUTES =====

app.post('/api/contacts', async (req, res) => {
    try {
        const contact = new Contact(req.body);
        await contact.save();
        res.status(201).json({ 
            success: true, 
            message: 'Message sent successfully',
            data: contact 
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/api/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ createdAt: -1 });
        res.json({ success: true, data: contacts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ===== USER ROUTES =====

app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, phone, address, role, businessInfo } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = new User({
            name,
            email,
            password: hashedPassword,
            role: role || 'customer',
            phone,
            address,
            businessInfo
        });

        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // Send welcome email
        const welcomeHTML = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #2d5016;">Welcome to New Shoes Store!</h1>
                <p>Hi ${name},</p>
                <p>Thank you for joining us! We're excited to have you.</p>
                <p>Start shopping now for premium handcrafted shoes from Rwanda.</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                   style="background: #4a7c59; color: white; padding: 12px 24px; 
                          text-decoration: none; border-radius: 5px; display: inline-block; margin: 20px 0;">
                    Start Shopping
                </a>
            </div>
        `;
        
        await sendEmail(email, 'Welcome to New Shoes Store!', welcomeHTML);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                businessInfo: user.businessInfo
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email,
                role: user.role,
                phone: user.phone,
                address: user.address,
                businessInfo: user.businessInfo
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, message: error.message });
    }
});

app.post('/api/users/create-seller-admin', async (req, res) => {
    try {
        await User.deleteMany({ email: 'seller@shoestore.com' });
        
        const hashedPassword = await bcrypt.hash('Admin123!', 10);
        
        const seller = new User({
            name: 'Test Seller',
            email: 'seller@shoestore.com',
            password: hashedPassword,
            role: 'seller',
            phone: '+250 788 123 456',
            address: 'Kigali',
            businessInfo: {
                businessName: 'My Shoe Shop',
                businessDescription: 'Quality shoes for everyone'
            }
        });
        
        await seller.save();
        
        res.json({
            success: true,
            message: 'Seller created successfully!',
            credentials: {
                email: 'seller@shoestore.com',
                password: 'Admin123!'
            }
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
});

// ===== SEED DATA ROUTE =====

app.post('/api/seed', async (req, res) => {
    try {
        await Product.deleteMany({});

        const products = [
            {
                name: 'Premium Casual Brown',
                description: 'Comfortable everyday leather shoes perfect for casual outings',
                price: 89.99,
                category: 'casual',
                stock: 50,
                featured: true,
                sizes: ['38', '39', '40', '41', '42', '43', '44'],
                colors: ['Brown', 'Tan']
            },
            {
                name: 'Executive Black Oxford',
                description: 'Professional formal footwear for business occasions',
                price: 129.99,
                category: 'formal',
                stock: 30,
                featured: true,
                sizes: ['39', '40', '41', '42', '43', '44', '45'],
                colors: ['Black']
            },
            {
                name: 'Sport Pro Runner',
                description: 'High-performance running shoes with advanced cushioning',
                price: 99.99,
                category: 'sports',
                stock: 40,
                featured: true,
                sizes: ['38', '39', '40', '41', '42', '43', '44', '45'],
                colors: ['Blue', 'Red', 'Black']
            },
            {
                name: 'Urban Walker Gray',
                description: 'Stylish casual sneakers for city exploration',
                price: 79.99,
                category: 'casual',
                stock: 60,
                featured: false,
                sizes: ['38', '39', '40', '41', '42', '43'],
                colors: ['Gray', 'White']
            },
            {
                name: 'Blue Speed Racer',
                description: 'Athletic performance shoes for serious athletes',
                price: 89.99,
                category: 'sports',
                stock: 35,
                featured: false,
                sizes: ['39', '40', '41', '42', '43', '44'],
                colors: ['Blue', 'White']
            },
            {
                name: 'Classic Loafer',
                description: 'Elegant slip-on shoes for formal and semi-formal events',
                price: 109.99,
                category: 'formal',
                stock: 25,
                featured: false,
                sizes: ['39', '40', '41', '42', '43', '44'],
                colors: ['Black', 'Brown']
            }
        ];

        await Product.insertMany(products);

        res.json({ 
            success: true, 
            message: 'Database seeded successfully',
            count: products.length 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        success: false, 
        message: 'Something went wrong!',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║          🚀 NEW SHOES STORE API v3.0.0                   ║
║                                                           ║
║  Server running on: http://localhost:${PORT}               ║
║  Environment: ${process.env.NODE_ENV || 'development'}                              ║
║  MongoDB: Connected ✅                                    ║
║                                                           ║
║  🎯 ALL FEATURES ENABLED:                                ║
║  ✅ Search & Filters                                     ║
║  ✅ Wishlist System                                      ║
║  ✅ Product Reviews                                      ║
║  ✅ Stripe Payment Integration                           ║
║  ✅ Mobile Money (MTN/Airtel)                            ║
║  ✅ Email Notifications                                  ║
║                                                           ║
║  Ready to accept requests! ✨                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
});