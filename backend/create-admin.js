const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Supabase connection
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAdmin() {
    try {
        console.log('🔄 Connecting to Supabase...\n');

        const adminData = {
            name: 'Admin User',
            email: 'admin@shoestore.com',
            password: 'Admin123!',
            role: 'admin',
            phone: '+250788123456',
            address: 'Kigali, Rwanda'
        };

        // Check if admin already exists
        const { data: existingAdmin, error: findError } = await supabase
            .from('users')
            .select('*')
            .eq('email', adminData.email)
            .single();

        if (findError && findError.code !== 'PGRST116') {
            throw findError;
        }

        if (existingAdmin) {
            console.log('⚠️ Admin already exists!');
            console.log('📧 Email:', existingAdmin.email);
            console.log('👤 Name:', existingAdmin.name);

            // Update role if needed
            if (existingAdmin.role !== 'admin') {
                const { error: updateError } = await supabase
                    .from('users')
                    .update({ role: 'admin' })
                    .eq('id', existingAdmin.id);

                if (updateError) throw updateError;

                console.log('✅ Updated role to admin!');
            }
        } else {
            console.log('🔐 Hashing password...');
            const hashedPassword = await bcrypt.hash(adminData.password, 10);

            console.log('👤 Creating admin account...');

            const { error: insertError } = await supabase
                .from('users')
                .insert([
                    {
                        name: adminData.name,
                        email: adminData.email,
                        password: hashedPassword,
                        role: adminData.role,
                        phone: adminData.phone,
                        address: adminData.address
                    }
                ]);

            if (insertError) throw insertError;

            console.log('✅ Admin account created successfully!\n');
        }

        console.log('═══════════════════════════════════════');
        console.log('📋 ADMIN LOGIN CREDENTIALS');
        console.log('═══════════════════════════════════════');
        console.log('📧 Email: admin@shoestore.com');
        console.log('🔑 Password: Admin123!');
        console.log('═══════════════════════════════════════\n');

        // Show all users
        const { data: users, error: usersError } = await supabase
            .from('users')
            .select('*');

        if (usersError) throw usersError;

        console.log('👥 All users:');

        users.forEach((user, index) => {
            console.log(`${index + 1}. ${user.email} - Role: ${user.role}`);
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

createAdmin();
