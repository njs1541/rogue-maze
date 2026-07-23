const fs = require('fs');
const path = require('path');

const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';
const jsDir = path.join(projectRoot, 'js');
const files = fs.readdirSync(jsDir).filter(f => f.endsWith('.js'));
const htmlFiles = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];

let findings = [];

function addFinding(category, file, line, message) {
    findings.push({ category, file, line, message });
}

// 1. HTML Inspection: Duplicate IDs & invalid script paths
htmlFiles.forEach(htmlFile => {
    const filePath = path.join(projectRoot, htmlFile);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');

    const seenIds = new Map();
    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const matches = line.matchAll(/\bid=["']([^"']+)["']/g);
        for (const m of matches) {
            const id = m[1];
            if (seenIds.has(id)) {
                addFinding('HTML_DUPLICATE_ID', htmlFile, lineNum, `Duplicate ID '${id}' previously defined at line ${seenIds.get(id)}`);
            } else {
                seenIds.set(id, lineNum);
            }
        }
    });
});

// 2. JS Inspection
files.forEach(file => {
    const code = fs.readFileSync(path.join(jsDir, file), 'utf8');
    const lines = code.split('\n');

    // Method duplicate declaration in classes or objects
    let currentClass = null;
    const classMethods = new Map(); // className -> Map(methodName -> line)

    // Switch case duplicate check
    let currentSwitchCases = null;

    lines.forEach((line, idx) => {
        const lineNum = idx + 1;
        const trimmed = line.trim();

        // Track class
        const classMatch = line.match(/^\s*class\s+([a-zA-Z0-9_$]+)/);
        if (classMatch) {
            currentClass = classMatch[1];
            classMethods.set(currentClass, new Map());
        }

        if (currentClass) {
            const methodMatch = line.match(/^\s*(?:async\s+)?([a-zA-Z0-9_$]+)\s*\([^)]*\)\s*\{/);
            if (methodMatch && !['if', 'for', 'while', 'switch', 'catch', 'constructor'].includes(methodMatch[1])) {
                const mName = methodMatch[1];
                const methodsMap = classMethods.get(currentClass);
                if (methodsMap.has(mName)) {
                    addFinding('DUPLICATE_METHOD', file, lineNum, `Method '${mName}' in class '${currentClass}' is defined again (previous line ${methodsMap.get(mName)})`);
                } else {
                    methodsMap.set(mName, lineNum);
                }
            }
        }

        // Switch case duplicate check
        if (trimmed.startsWith('switch')) {
            currentSwitchCases = new Set();
        } else if (currentSwitchCases) {
            if (trimmed.startsWith('case ')) {
                const caseVal = trimmed.substring(5, trimmed.indexOf(':')).trim();
                if (currentSwitchCases.has(caseVal)) {
                    addFinding('DUPLICATE_SWITCH_CASE', file, lineNum, `Duplicate switch case label '${caseVal}'`);
                } else {
                    currentSwitchCases.add(caseVal);
                }
            } else if (trimmed === '}' && currentSwitchCases) {
                currentSwitchCases = null;
            }
        }

        // Typos & Weird expressions
        if (/\b(this|player|monster|boss)\.X\b|\b(this|player|monster|boss)\.Y\b/.test(line)) {
            addFinding('POSSIBLE_TYPO_CAPITAL_POS', file, lineNum, `Upper case .X or .Y used: ${trimmed}`);
        }

        if (/\.addEventlistener\b|\.addEventlistner\b/.test(line)) {
            addFinding('TYPO_EVENT_LISTENER', file, lineNum, `Typo in addEventListener: ${trimmed}`);
        }

        if (/\bMath\.floorr\b|\bMath\.radom\b|\bMath\.Ceil\b|\bMath\.absoulte\b/.test(line)) {
            addFinding('TYPO_MATH', file, lineNum, `Typo in Math method: ${trimmed}`);
        }

        // Unused / weird comparison: e.g. x === x
        if (/\b([a-zA-Z0-9_$]+)\s*===\s*\1\b/.test(line) && !/typeof/.test(line)) {
            addFinding('SELF_COMPARISON', file, lineNum, `Comparing variable to itself: ${trimmed}`);
        }

        // NaN comparison
        if (/===\s*NaN\b|==\s*NaN\b|\bNaN\s*===|\bNaN\s*==/.test(line)) {
            addFinding('INVALID_NAN_COMPARISON', file, lineNum, `Invalid NaN comparison: ${trimmed}`);
        }
    });
});

console.log(`Deep inspection found ${findings.length} issues:\n`);
findings.forEach(f => {
    console.log(`[${f.category}] ${f.file}:${f.line} - ${f.message}`);
});

fs.writeFileSync(path.join(projectRoot, 'scratch/deep_findings.json'), JSON.stringify(findings, null, 2));
