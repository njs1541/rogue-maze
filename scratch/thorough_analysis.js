const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';
const jsDir = path.join(projectRoot, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const htmlFiles = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];

let report = [];

function log(cat, file, line, msg) {
    report.push({ cat, file, line: line || 0, msg });
}

// --- 1. HTML Element ID Mapping ---
const htmlIds = new Map();
htmlFiles.forEach(h => {
    const content = fs.readFileSync(path.join(projectRoot, h), 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, i) => {
        const matches = line.matchAll(/\bid=["']([^"']+)["']/g);
        for (const m of matches) {
            const id = m[1];
            if (!htmlIds.has(id)) htmlIds.set(id, `${h}:${i+1}`);
        }
    });
});

// JS getElementById Check
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const matches = line.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
        for (const m of matches) {
            const id = m[1];
            if (!htmlIds.has(id)) {
                log('MISSING_DOM_ID', file, lineNum, `getElementById('${id}') - '${id}' does NOT exist in any HTML file.`);
            }
        }
    });
});

// --- 2. Class / Function Duplicate & Overwrites ---
const functionDefs = new Map(); // funcName -> [{file, line}]
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    let currentClassName = null;
    let classMethods = new Map();

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        // Class definition
        const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_$]+)/);
        if (classMatch) {
            currentClassName = classMatch[1];
            classMethods = new Map();
        }

        // Method in class
        if (currentClassName && /^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/.test(line)) {
            const m = line.match(/^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*\(/)[1];
            if (!['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(m)) {
                if (classMethods.has(m)) {
                    log('DUPLICATE_CLASS_METHOD', file, lineNum, `Method '${m}' in class '${currentClassName}' was previously defined at line ${classMethods.get(m)} in the same class!`);
                } else {
                    classMethods.set(m, lineNum);
                }
            }
        }

        // Standalone functions
        const funcMatch = line.match(/^function\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (funcMatch) {
            const fname = funcMatch[1];
            if (!functionDefs.has(fname)) functionDefs.set(fname, []);
            functionDefs.get(fname).push({ file, line: lineNum });
        }
    });
});

for (const [fname, locs] of functionDefs.entries()) {
    if (locs.length > 1) {
        const desc = locs.map(l => `${l.file}:${l.line}`).join(', ');
        log('DUPLICATE_GLOBAL_FUNCTION', locs[0].file, locs[0].line, `Global function '${fname}' is defined multiple times: ${desc}`);
    }
}

// --- 3. Property & Variable Typos / Misnamed Check ---
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        // Typo checks
        if (/\b\.lenght\b/.test(line)) log('TYPO', file, lineNum, "'.lenght' property typo");
        if (/\b\.innertext\b/.test(line)) log('TYPO', file, lineNum, "'.innertext' property typo (should be .innerText)");
        if (/\b\.addEventlistener\b|\b\.addEventlistner\b/.test(line)) log('TYPO', file, lineNum, "addEventListener method typo");
        if (/\bMath\.(floorr|radom|Ceil|absoulte)\b/.test(line)) log('TYPO', file, lineNum, "Math object method typo");

        // Property inconsistency checks
        if (/\b\.isEnemyBullet\b/.test(line)) log('PROPERTY_INCONSISTENCY', file, lineNum, "Reference to '.isEnemyBullet' (Bullet class uses '.isPlayerBullet')");
        if (/\b\.isEnemy\b/.test(line) && !/monsterAI\.js/.test(file)) log('PROPERTY_INCONSISTENCY', file, lineNum, "Reference to '.isEnemy' property (Bullet class uses '.isPlayerBullet')");

        // NaN comparison check
        if (/===?\s*NaN\b|\bNaN\s*===?/.test(line)) log('LOGIC_ERROR', file, lineNum, "Invalid NaN comparison (use Number.isNaN() or isNaN())");

        // Single '=' in if statement assignment risk
        if (/\bif\s*\(\s*[a-zA-Z0-9_$]+\.[a-zA-Z0-9_$]+\s*=\s*[^=]/.test(line) && !/===?|!==?|<=|>=/.test(line)) {
            log('LOGIC_ERROR', file, lineNum, `Potential accidental assignment inside if condition: ${trimmed}`);
        }
    });
});

fs.writeFileSync(path.join(projectRoot, 'scratch/thorough_analysis.json'), JSON.stringify(report, null, 2));
console.log(`Thorough analysis complete. Found ${report.length} entries.`);
