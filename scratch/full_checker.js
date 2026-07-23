const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';
const jsDir = path.join(projectRoot, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const htmlFiles = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];

let report = [];

function logReport(section, title, detail) {
    report.push(`[${section}] ${title}\n  ${detail}\n`);
}

// --- 1. DOM ID Extraction & Verification ---
const htmlIds = new Set();
htmlFiles.forEach(htmlFile => {
    const filePath = path.join(projectRoot, htmlFile);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const idRegex = /id=["']([^"']+)["']/g;
    let match;
    while ((match = idRegex.exec(content)) !== null) {
        htmlIds.add(match[1]);
    }
});

files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
        const lineNum = idx + 1;

        // document.getElementById('xxx')
        const getElemMatches = line.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
        for (const m of getElemMatches) {
            const id = m[1];
            if (!htmlIds.has(id)) {
                logReport('MISSING_DOM_ID', `${file}:${lineNum}`, `getElementById('${id}') referred but '${id}' is NOT found in any HTML file!`);
            }
        }
    });
});

// --- 2. Global Declaration Collisions ---
const declarations = {}; // name -> [{file, line, type}]
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');
    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        // class X
        const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_$]+)/);
        if (classMatch) {
            const name = classMatch[1];
            if (!declarations[name]) declarations[name] = [];
            declarations[name].push({ file, line: lineNum, type: 'class' });
        }

        // function X
        const funcMatch = line.match(/^function\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (funcMatch) {
            const name = funcMatch[1];
            if (!declarations[name]) declarations[name] = [];
            declarations[name].push({ file, line: lineNum, type: 'function' });
        }

        // var/let/const at root level
        const varMatch = line.match(/^(?:var|let|const)\s+([a-zA-Z0-9_$]+)\s*=/);
        if (varMatch) {
            const name = varMatch[1];
            if (!declarations[name]) declarations[name] = [];
            declarations[name].push({ file, line: lineNum, type: 'top_var' });
        }
    });
});

for (const [name, locs] of Object.entries(declarations)) {
    if (locs.length > 1) {
        // Exclude index.html script tag overrides if intentional, but check collisions
        const details = locs.map(l => `${l.file}:${l.line} (${l.type})`).join(', ');
        logReport('DUPLICATE_GLOBAL', name, `Global identifier '${name}' declared ${locs.length} times: ${details}`);
    }
}

// --- 3. Code logic checks ---
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        // Typos in common properties / methods
        if (/\b(addEventlistener|addEventlistner|getElementby|getElementsby|innertext|style\.colr|Math\.floorr|Math\.radom|lenght|proptype)\b/.test(line)) {
            logReport('TYPO', `${file}:${lineNum}`, line.trim());
        }

        // Single '=' in conditional (excluding == and === and <= and >= and !=)
        // e.g. if (x = 5)
        if (/\bif\s*\([^=]*[^=!<>]=[^=]/.test(line) && !/===?|!==?|<=|>=/.test(line)) {
            // filter false positives like arrow functions or simple compares
            if (/\bif\s*\(\s*[a-zA-Z0-9_$]+(?:\.[a-zA-Z0-9_$]+)*\s*=\s*[^=]/.test(line)) {
                logReport('ASSIGN_IN_IF', `${file}:${lineNum}`, line.trim());
            }
        }

        // NaN comparisons (e.g. === NaN)
        if (/===?\s*NaN\b|\bNaN\s*===?/.test(line)) {
            logReport('INVALID_NAN_CHECK', `${file}:${lineNum}`, line.trim());
        }

        // Duplicate case labels inside switch in same file (simple check)
        // Check for undefined property access patterns or typos
    });
});

fs.writeFileSync(path.join(projectRoot, 'scratch/report.txt'), report.join('\n'), 'utf8');
console.log(`Scan completed. ${report.length} findings logged to scratch/report.txt.`);
