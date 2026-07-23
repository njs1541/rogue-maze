const fs = require('fs');
const path = require('path');
const vm = require('vm');

const targetDirs = ['js'];
const targetHtmls = ['index.html', 'cards_list.html', 'map_editor.html', 'monster_plan.html', 'weapon_combinations.html'];
const projectRoot = 'c:/Users/NZIN/Downloads/개인 개발분/미로찾기';

console.log("=== 1. JS Syntax Check ===");
const jsFiles = fs.readdirSync(path.join(projectRoot, 'js')).filter(f => f.endsWith('.js'));

jsFiles.forEach(file => {
    const filePath = path.join(projectRoot, 'js', file);
    const code = fs.readFileSync(filePath, 'utf8');
    try {
        new vm.Script(code, { filename: file });
        console.log(`[OK] ${file}`);
    } catch (err) {
        console.error(`[SYNTAX ERROR] ${file}: line ${err.stack}`);
    }
});

console.log("\n=== 2. HTML Inline JS Syntax Check ===");
targetHtmls.forEach(htmlFile => {
    const filePath = path.join(projectRoot, htmlFile);
    if (!fs.existsSync(filePath)) return;
    const content = fs.readFileSync(filePath, 'utf8');
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    let index = 0;
    while ((match = scriptRegex.exec(content)) !== null) {
        index++;
        const scriptContent = match[1];
        // skip external script src tags if empty content
        if (!scriptContent.trim()) continue;
        try {
            new vm.Script(scriptContent, { filename: `${htmlFile} (script #${index})` });
            console.log(`[OK] ${htmlFile} inline script #${index}`);
        } catch (err) {
            console.error(`[SYNTAX ERROR] ${htmlFile} inline script #${index}: ${err.message}`);
        }
    }
});
