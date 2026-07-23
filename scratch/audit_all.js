const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';
const jsDir = path.join(projectRoot, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const htmlFiles = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];

console.log("========================================");
console.log(" FULL PROJECT COMPREHENSIVE AUDIT REPORT");
console.log("========================================\n");

let issues = [];

function recordIssue(severity, file, line, type, description) {
    issues.push({ severity, file, line, type, description });
}

// --- CHECK 1: Event Listeners inside update/render loop ---
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');
    let insideLoop = false;
    let loopName = '';

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        if (/\b(update|render|draw|animate|loop|step)\s*\([^)]*\)\s*\{/.test(line)) {
            insideLoop = true;
            loopName = line.trim();
        }

        if (insideLoop && /\.addEventListener\b/.test(line)) {
            recordIssue('HIGH', file, lineNum, 'EVENT_LISTENER_IN_LOOP', `addEventListener called inside update/render/draw loop '${loopName}'. Memory leak risk!`);
        }
    });
});

// --- CHECK 2: NaN Comparison & Math operations ---
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        if (/===\s*NaN\b|==\s*NaN\b|\bNaN\s*===|\bNaN\s*==/.test(line)) {
            recordIssue('HIGH', file, lineNum, 'INVALID_NAN_COMPARISON', `Comparison with NaN using === or == will always yield false. Use Number.isNaN().`);
        }

        if (/\bMath\.(floorr|radom|Ceil|absoulte|sqr)\b/.test(line)) {
            recordIssue('CRITICAL', file, lineNum, 'MATH_TYPO', `Typo in Math method call: ${trimmed}`);
        }
    });
});

// --- CHECK 3: CSS Class References Check ---
const cssPath = path.join(projectRoot, 'css/style.css');
let cssClasses = new Set();
if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    const classRegex = /\.([a-zA-Z0-9_-]+)/g;
    let m;
    while ((m = classRegex.exec(cssContent)) !== null) {
        cssClasses.add(m[1]);
    }
}

// --- CHECK 4: HTML Duplicate IDs & ID mismatch with JS ---
const allHtmlIds = new Map(); // id -> htmlFile
htmlFiles.forEach(htmlFile => {
    const filePath = path.join(projectRoot, htmlFile);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const matches = line.matchAll(/\bid=["']([^"']+)["']/g);
        for (const m of matches) {
            const id = m[1];
            if (allHtmlIds.has(id)) {
                recordIssue('MEDIUM', htmlFile, lineNum, 'DUPLICATE_HTML_ID', `ID '${id}' is defined multiple times (also in ${allHtmlIds.get(id)})`);
            } else {
                allHtmlIds.set(id, `${htmlFile}:${lineNum}`);
            }
        }
    });
});

// Verify getElementById in JS vs allHtmlIds
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const matches = line.matchAll(/document\.getElementById\(['"]([^'"]+)['"]\)/g);
        for (const m of matches) {
            const id = m[1];
            if (!allHtmlIds.has(id)) {
                recordIssue('HIGH', file, lineNum, 'MISSING_HTML_ELEMENT', `getElementById('${id}') but element '${id}' is missing in HTML files.`);
            }
        }
    });
});

// --- CHECK 5: Array & Object operations typos or bugs ---
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*')) return;

        if (/\.lenght\b/.test(line)) {
            recordIssue('CRITICAL', file, lineNum, 'TYPO_LENGTH', `'.lenght' property typo found.`);
        }
        if (/\.innertext\b/.test(line)) {
            recordIssue('MEDIUM', file, lineNum, 'TYPO_INNERTEXT', `'.innertext' (lowercase 't') typo found. JS DOM property is '.innerText'.`);
        }
        if (/\.innerHTML\s*=\s*['"]<[^>]+$/i.test(line)) {
            recordIssue('LOW', file, lineNum, 'UNCLOSED_HTML_STRING', `Unclosed HTML tag in innerHTML string assignment.`);
        }
    });
});

fs.writeFileSync(path.join(projectRoot, 'scratch/audit_report.json'), JSON.stringify(issues, null, 2));
console.log(`Audit complete. Found ${issues.length} issues.`);
