const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Supabase connection
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Admin credentials
const ADMIN_EMAIL = 'admin@shoestore.com';
const ADMIN_PASSWORD = 'YourNewPassword123!';

const SELLER_EMAIL = 'seller@shoestore.com';
const SELLER_PASSWORD = 'SellerPassword123!';

async function seedAdmin() {
    try {
        console.log('🔄 Connecting to Supabase...\n');

        // =========================
        // CREATE ADMIN
        // =========================

        const { data: adminExists, error: adminFindError } = await supabase
            .from('users')
            .select('*')
            .eq('email', ADMIN_EMAIL)
            .single();

        if (adminFindError && adminFindError.code !== 'PGRST116') {
            throw adminFindError;
        }

        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);

            const { error: adminInsertError } = await supabase
                .from('users')
                .insert([
                    {
                        name: 'Admin User',
                        email: ADMIN_EMAIL,
                        password: hashedPassword,
                        role: 'admin'
                    }
                ]);

            if (adminInsertError) throw adminInsertError;

            console.log('✅ Admin account created:', ADMIN_EMAIL);
        } else {
            console.log('⚠️ Admin already exists');
        }

        // =========================
        // CREATE SELLER
        // =========================

        const { data: sellerExists, error: sellerFindError } = await supabase
            .from('users')
            .select('*')
            .eq('email', SELLER_EMAIL)
            .single();

        if (sellerFindError && sellerFindError.code !== 'PGRST116') {
            throw sellerFindError;
        }

        if (!sellerExists) {
            const hashedPassword = await bcrypt.hash(SELLER_PASSWORD, 10);

            const { error: sellerInsertError } = await supabase
                .from('users')
                .insert([
                    {
                        name: 'Seller User',
                        email: SELLER_EMAIL,
                        password: hashedPassword,
                        role: 'seller'
                    }
                ]);

            if (sellerInsertError) throw sellerInsertError;

            console.log('✅ Seller account created:', SELLER_EMAIL);
        } else {
            console.log('⚠️ Seller already exists');
        }

        console.log('\n✅ Seeding complete!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

seedAdmin();
