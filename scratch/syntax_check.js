const fs = require('fs');
const path = require('path');
const vm = require('vm');

const files = [
    path.join(__dirname, '../js/monsterAI.js'),
    path.join(__dirname, '../js/monster.js'),
    path.join(__dirname, '../js/bossEngine.js')
];

files.forEach(file => {
    try {
        const code = fs.readFileSync(file, 'utf8');
        new vm.Script(code);
        console.log(`✅ [SYNTAX OK] ${path.basename(file)}`);
    } catch (err) {
        console.error(`❌ [SYNTAX ERROR] ${path.basename(file)}:`, err.message);
    }
});
