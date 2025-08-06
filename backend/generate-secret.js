#!/usr/bin/env node

/**
 * Generate a secure session secret for your application
 * Run this script to generate a new session secret
 */

const crypto = require('crypto');

// Generate a 64-character random hex string
const sessionSecret = crypto.randomBytes(32).toString('hex');

console.log('🔐 Generated Session Secret:');
console.log('='.repeat(50));
console.log(sessionSecret);
console.log('='.repeat(50));
console.log('\n📝 Add this to your .env file as:');
console.log(`SESSION_SECRET=${sessionSecret}`);
console.log('\n⚠️  Keep this secret secure and never commit it to version control!'); 