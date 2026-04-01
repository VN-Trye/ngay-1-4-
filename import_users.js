const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const User = require('./schemas/users');
const Role = require('./schemas/roles');
const { sendPasswordMail } = require('./utils/mailHandler');

const MONGODB_URI = 'mongodb://localhost:27017/NNPTUD-C4';

// Function to generate a random 16-character password
function generatePassword() {
    return crypto.randomBytes(8).toString('hex'); // 8 bytes = 16 hex characters
}

async function importUsers() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log("Connected to MongoDB -> " + MONGODB_URI);

        // 1. Ensure 'user' role exists
        let role = await Role.findOne({ name: 'user' });
        if (!role) {
            role = new Role({ name: 'user', description: 'Standard user role' });
            await role.save();
            console.log("Created 'user' role with ID:", role._id);
        } else {
            console.log("Found existing 'user' role with ID:", role._id);
        }

        // 2. Read users.txt
        const filePath = path.join(__dirname, 'users.txt');
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

        // Remove header line if it is "username\temail"
        if (lines[0].includes('username') && lines[0].includes('email')) {
            lines.shift();
        }

        console.log(`Found ${lines.length} users to import.`);

        let successCount = 0;
        let failCount = 0;

        for (const line of lines) {
            // Support tab or space separation based on the input format
            const [username, email] = line.split(/[\t\s]+/).filter(Boolean);
            if (!username || !email) continue;

            const password = generatePassword();

            try {
                // Check if user exists
                let existingUser = await User.findOne({ 
                    $or: [{ username }, { email }] 
                });

                if (existingUser) {
                    console.log(`Skipping: User ${username} or email ${email} already exists.`);
                    failCount++;
                    continue;
                }

                // Create user
                const newUser = new User({
                    username,
                    email,
                    password, // pre-save hook will hash this
                    role: role._id,
                    fullName: username
                });

                await newUser.save();
                successCount++;

                // Send email
                await sendPasswordMail(email, username, password);
                console.log(`Created user ${username} and sent password email.`);
            } catch (err) {
                console.error(`Error importing user ${username}:`, err.message);
                failCount++;
            }
        }

        console.log(`\nImport complete! Successfully imported: ${successCount}, Failed/Skipped: ${failCount}`);
    } catch (error) {
        console.error("Fatal Error during import:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

importUsers();
