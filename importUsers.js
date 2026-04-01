const fs = require('fs');
const readline = require('readline');
const mongoose = require('mongoose');
const crypto = require('crypto');
const userModel = require('./schemas/users');
const roleModel = require('./schemas/roles');
const mailHandler = require('./utils/mailHandler');

async function importUsers() {
    try {
        console.log("Connecting to database...");
        await mongoose.connect('mongodb://localhost:27017/NNPTUD-C4');
        console.log("Connected to MongoDB.");

        // Find the 'user' role
        let userRole = await roleModel.findOne({ name: 'user' });
        if (!userRole) {
            console.log("Role 'user' not found. Creating it...");
            userRole = new roleModel({ name: 'user', description: 'Normal user' });
            await userRole.save();
        }

        console.log("Reading users.txt...");
        const fileStream = fs.createReadStream('users.txt');
        const rl = readline.createInterface({
            input: fileStream,
            crlfDelay: Infinity
        });

        let isFirstLine = true;
        for await (const line of rl) {
            if (isFirstLine) {
                isFirstLine = false;
                continue; // Skip header
            }

            if (!line.trim()) continue;

            // Assuming tab-separated values based on users.txt format
            const parts = line.split('\t');
            if (parts.length >= 2) {
                const username = parts[0].trim();
                const email = parts[1].trim();

                let existingUser = await userModel.findOne({ $or: [{ username: username }, { email: email }] });
                if (existingUser) {
                    // console.log(`User ${username} or email ${email} already exists. Skipping...`);
                    continue;
                }

                // Generate a 16-character random password
                const password = crypto.randomBytes(8).toString('hex'); // 8 bytes = 16 hex characters

                let newUser = new userModel({
                    username: username,
                    email: email,
                    password: password,
                    role: userRole._id
                });

                await newUser.save();
                console.log(`Created user: ${username} with email: ${email}`);

                // Send email to user
                await mailHandler.sendPasswordMail(email, username, password);
            }
        }
        
        console.log("Import completed successfully.");
    } catch (error) {
        console.error("Error importing users:", error);
    } finally {
        await mongoose.disconnect();
        console.log("Disconnected from MongoDB.");
    }
}

importUsers();
