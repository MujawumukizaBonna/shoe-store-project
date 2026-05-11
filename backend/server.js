const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Email configuration
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/products/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Middleware to verify token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ message: 'Invalid token' });
        req.user = user;
        next();
    });
};

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to New Shoes Store API',
        version: '4.0.0 - SUPABASE VERSION',
        features: [
            'Search & Filters',
            'Wishlist System',
            'Product Reviews',
            'Stripe Payment Integration',
            'Mobile Money (MTN/Airtel)',
            'Email Notifications',
            'Supabase Backend'
        ],
        endpoints: {
            products: '/api/products',
            orders: '/api/orders',
            wishlist: '/api/wishlist',
            reviews: '/api/reviews',
            payment: {
                stripe: '/api/payment/create-intent',
                momo: '/api/payment/momo'
            },
            contacts: '/api/contacts',
            users: '/api/users'
        }
    });
});

// ==================== AUTH ROUTES ====================

// Register
app.post('/api/users/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        // Check if user exists
        const { data: existing } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .single();

        if (existing) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Insert user
        const { data, error } = await supabase
            .from('users')
            .insert([{
                name,
                email,
                password: hashedPassword,
                role: role || 'customer'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({ message: 'User registered successfully', user: data });
    } catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Login
app.post('/api/users/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Find user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('role', role || 'customer')
            .single();

        if (error || !user) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Check password
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Create token
        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== PRODUCTS ROUTES ====================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const { search, category, minPrice, maxPrice, sort } = req.query;
        
        let query = supabase.from('products').select('*');

        if (search) {
            query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
        }

        if (category) {
            query = query.eq('category', category);
        }

        if (minPrice) {
            query = query.gte('price', minPrice);
        }

        if (maxPrice) {
            query = query.lte('price', maxPrice);
        }

        if (sort === 'price_low') {
            query = query.order('price', { ascending: true });
        } else if (sort === 'price_high') {
            query = query.order('price', { ascending: false });
        } else if (sort === 'rating') {
            query = query.order('average_rating', { ascending: false });
        } else {
            query = query.order('created_at', { ascending: false });
        }

        const { data, error } = await query;

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create product
app.post('/api/products', authenticateToken, upload.single('image'), async (req, res) => {
    try {
        const { name, description, price, category, brand, size, color, stock } = req.body;
        const image = req.file ? `/uploads/products/${req.file.filename}` : null;

        const { data, error } = await supabase
            .from('products')
            .insert([{
                name,
                description,
                price,
                category,
                brand,
                size,
                color,
                stock,
                image,
                seller_id: req.user.id
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Product created successfully',
            product: data
        });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update product
app.put('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, brand, size, color, stock } = req.body;

        const { data, error } = await supabase
            .from('products')
            .update({
                name,
                description,
                price,
                category,
                brand,
                size,
                color,
                stock
            })
            .eq('id', id)
            .eq('seller_id', req.user.id)
            .select();

        if (error) throw error;

        res.json({ message: 'Product updated successfully', product: data });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;

        const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', id)
            .eq('seller_id', req.user.id);

        if (error) throw error;

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== ORDERS ROUTES ====================

// Create order
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

        const { data, error } = await supabase
            .from('orders')
            .insert([{
                user_id: req.user.id,
                items,
                total_amount: totalAmount,
                shipping_address: shippingAddress,
                payment_method: paymentMethod,
                payment_status: 'pending',
                order_status: 'pending'
            }])
            .select()
            .single();

        if (error) throw error;

        res.status(201).json({
            message: 'Order placed successfully',
            order: data
        });
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', req.user.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== WISHLIST ROUTES ====================

// Get wishlist
app.get('/api/wishlist/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const { data, error } = await supabase
            .from('wishlist')
            .select(`
                *,
                products (*)
            `)
            .eq('user_id', userId);

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add to wishlist
app.post('/api/wishlist/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { productId } = req.body;

        const { data, error } = await supabase
            .from('wishlist')
            .insert([{
                user_id: userId,
                product_id: productId
            }])
            .select();

        if (error) {
            if (error.code === '23505') {
                return res.status(400).json({ message: 'Already in wishlist' });
            }
            throw error;
        }

        res.status(201).json({ message: 'Added to wishlist', data });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Remove from wishlist
app.delete('/api/wishlist/:userId/:productId', async (req, res) => {
    try {
        const { userId, productId } = req.params;

        const { error } = await supabase
            .from('wishlist')
            .delete()
            .eq('user_id', userId)
            .eq('product_id', productId);

        if (error) throw error;

        res.json({ message: 'Removed from wishlist' });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== REVIEWS ROUTES ====================

// Get reviews for product
app.get('/api/reviews', async (req, res) => {
    try {
        const { productId } = req.query;

        const { data, error } = await supabase
            .from('reviews')
            .select('*')
            .eq('product_id', productId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        res.json(data || []);
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add review
app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const { productId, rating, comment } = req.body;

        const { data: user } = await supabase
            .from('users')
            .select('name')
            .eq('id', req.user.id)
            .single();

        const { data: review, error: reviewError } = await supabase
            .from('reviews')
            .insert([{
                product_id: productId,
                user_id: req.user.id,
                user_name: user?.name || 'Anonymous',
                rating,
                comment
            }])
            .select()
            .single();

        if (reviewError) throw reviewError;

        const { data: reviews } = await supabase
            .from('reviews')
            .select('rating')
            .eq('product_id', productId);

        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

        await supabase
            .from('products')
            .update({
                average_rating: avgRating,
                review_count: reviews.length
            })
            .eq('id', productId);

        res.status(201).json({ message: 'Review added successfully', review });
    } catch (error) {
        console.error('Add review error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ==================== PAYMENT ROUTES ====================

app.post('/api/payment/create-intent', async (req, res) => {
    try {
        const { amount } = req.body;
        res.json({
            clientSecret: 'mock_client_secret_' + Date.now(),
            message: 'Payment intent created (mock)'
        });
    } catch (error) {
        res.status(500).json({ message: 'Payment error', error: error.message });
    }
});

app.post('/api/payment/momo', async (req, res) => {
    try {
        const { phoneNumber, amount, orderId } = req.body;
        res.json({
            success: true,
            transactionId: 'MOMO' + Date.now(),
            message: 'Mobile money payment initiated (mock)'
        });
    } catch (error) {
        res.status(500).json({ message: 'Payment error', error: error.message });
    }
});

// ==================== CONTACTS ROUTE ====================

app.post('/api/contacts', async (req, res) => {
    try {
        const { name, email, message } = req.body;

        const { data, error } = await supabase
            .from('contacts')
            .insert([{ name, email, message }])
            .select();

        if (error) throw error;

        res.status(201).json({ message: 'Message sent successfully', data });
    } catch (error) {
        console.error('Contact error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Using Supabase backend`);
});