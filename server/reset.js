const { wipeAllProductionData } = require('./db');

console.log('--- Wiping all test data for production ---');
wipeAllProductionData();
console.log('--- Done! Database is now empty and ready for actual production use ---');
