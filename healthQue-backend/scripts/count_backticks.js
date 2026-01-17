const fs = require('fs');
const s = fs.readFileSync('controllers/profileController.js', 'utf8');
const cnt = (s.match(/`/g) || []).length;
console.log('backticks:', cnt);
