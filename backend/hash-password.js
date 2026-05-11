const bcrypt = require('bcryptjs');

const password = 'Admin123!'; // Change this!

bcrypt.hash(password, 10, (err, hash) => {
    console.log('Password:', password);
    console.log('Hash:', hash);
});