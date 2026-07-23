const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';
const jsDir = path.join(projectRoot, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));

const htmlFiles = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];

console.log("=========================================");
console.log("        DEEP CODE QUALITY ANALYSIS       ");
console.log("=========================================\n");

// 1. Analyze Duplicated Global Function/Variable Declarations across JS files
const globalDeclarations = {}; // name -> [{file, line, type}]

files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;

        // Function declarations: function foo(
        const funcMatch = line.match(/^\s*(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
        if (funcMatch) {
            const name = funcMatch[1];
            if (!globalDeclarations[name]) globalDeclarations[name] = [];
            globalDeclarations[name].push({ file, line: lineNum, type: 'function' });
        }

        // Global var/let/const at top level or attached to window
        const windowMatch = line.match(/window\.([a-zA-Z0-9_$]+)\s*=/);
        if (windowMatch) {
            const name = windowMatch[1];
            if (!globalDeclarations[name]) globalDeclarations[name] = [];
            globalDeclarations[name].push({ file, line: lineNum, type: 'window_prop' });
        }

        const topVarMatch = line.match(/^(?:var|let|const)\s+([a-zA-Z0-9_$]+)\s*=/);
        if (topVarMatch) {
            const name = topVarMatch[1];
            if (!globalDeclarations[name]) globalDeclarations[name] = [];
            globalDeclarations[name].push({ file, line: lineNum, type: 'top_var' });
        }
    });
});

console.log("--- 1. DUPLICATE GLOBAL DECLARATIONS & OVERWRITES ---");
for (const [name, locs] of Object.entries(globalDeclarations)) {
    if (locs.length > 1) {
        console.log(`[DUPLICATE DECLARATION] Name '${name}' is declared multiple times:`);
        locs.forEach(l => console.log(`  - ${l.file}:${l.line} (${l.type})`));
    }
}

// 2. Scan each file for common suspicious patterns
console.log("\n--- 2. SUSPICIOUS PATTERNS & CODE SMELLS ---");

files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return;

        // Check 1: Single '=' inside if condition: if (a = b)
        if (/\bif\s*\(\s*[a-zA-Z0-9_$.]+\s*=\s*[^=]/.test(line) && !/==/.test(line)) {
            console.log(`[POTENTIAL ASSIGNMENT IN IF] ${file}:${lineNum}: ${trimmed}`);
        }

        // Check 2: Misspelled methods or common typos
        if (/\b(addEventlistener|addEventlistner|document\.getElementby|getElementsby|innertext|style\.colr|Math\.floorr|Math\.radom|lenght|proptype)\b/i.test(line)) {
            console.log(`[POSSIBLE TYPO] ${file}:${lineNum}: ${trimmed}`);
        }

        // Check 3: Duplicate object keys in line or multi-line (simple line check)
        // Check 4: Console.log leftover (if large amounts or weird logs)
        // Check 5: NaN risk e.g., parseInt without radix or loose NaN comparison `== NaN` or `=== NaN`
        if (/===?\s*NaN\b|\bNaN\s*===?/.test(line)) {
            console.log(`[INVALID NaN COMPARISON] ${file}:${lineNum}: Use isNaN() instead! -> ${trimmed}`);
        }

        // Check 6: Array methods return check or forEach with return expression
        // Check 7: Undeclared variables assigned without var/let/const inside function (scope leak)
        const undeclaredAssign = line.match(/^\s*([a-zA-Z0-9_$]+)\s*=\s*[^=;]+;/);
        if (undeclaredAssign) {
            const varName = undeclaredAssign[1];
            // If it's inside a function and not defined in line, might be window leak, but let's filter known ones
        }

        // Check 8: Duplicate case labels in switch statement
    });
});

console.log("\n--- 3. UNREACHABLE CODE DETECTOR ---");
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');
    let afterReturn = false;

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        if (trimmed === '}' || trimmed.startsWith('case ') || trimmed.startsWith('default:') || trimmed.startsWith('else')) {
            afterReturn = false;
        }

        if (afterReturn && trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*') && trimmed !== '}') {
            // Unreachable candidate
            if (!trimmed.startsWith('break;') && !trimmed.startsWith('return') && !trimmed.startsWith('catch')) {
                // console.log(`[UNREACHABLE CODE?] ${file}:${lineNum}: ${trimmed}`);
            }
        }

        if (/\breturn\b|\bthrow\b/.test(trimmed) && !trimmed.includes('{') && trimmed.endsWith(';')) {
            afterReturn = true;
        }
    });
});

console.log("\nDone initial deep analysis scan.");
