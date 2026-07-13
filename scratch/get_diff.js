const { execSync } = require('child_process');
const fs = require('fs');

try {
    const diff = execSync('git diff 0a775ca 2d5d239 -- js/bullet.js', { encoding: 'utf8' });
    fs.writeFileSync('scratch/bullet_diff.txt', diff, 'utf8');
    console.log('Diff saved to scratch/bullet_diff.txt');
} catch (err) {
    console.error(err);
}
