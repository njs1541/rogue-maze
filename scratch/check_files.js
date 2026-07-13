const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const workspaceDir = 'c:\\Users\\NZIN\\Downloads\\개인 개발분\\미로찾기';

// 검사할 확장자
const allowedExtensions = ['.js', '.html', '.css', '.md'];

// 무시할 디렉토리
const ignoredDirs = ['.git', 'node_modules', 'scratch', 'archive', 'assets', 'map_preset'];

// 비정상 문자 정규식 또는 패턴들
// 1. Unicode Replacement Character (U+FFFD) - 인코딩 깨짐의 대표적 심볼
const FFFD_PATTERN = /\uFFFD/g;

// 2. 비정상적인 제어 문자나 깨진 한글 패턴 감지
// UTF-8로 해석된 CP949 한글 깨짐 (예: 占쏙옙, 짹, 혻 등)
const BROKEN_KOREAN_PATTERNS = [
    /占쏙옙/g,
    /占쎈/g,
];

function getFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (!ignoredDirs.includes(file)) {
                getFiles(filePath, fileList);
            }
        } else {
            const ext = path.extname(file).toLowerCase();
            if (allowedExtensions.includes(ext)) {
                fileList.push(filePath);
            }
        }
    }
    return fileList;
}

function checkFile(filePath) {
    const relativePath = path.relative(workspaceDir, filePath);
    const results = [];
    
    // 1. 파일 읽기 시도
    let content;
    try {
        const rawBuffer = fs.readFileSync(filePath);
        // UTF-8로 디코딩
        content = rawBuffer.toString('utf8');
        
        // 디코딩 시 유효하지 않은 바이트 시퀀스가 UTF-8로 변환되면 U+FFFD () 가 발생함
        if (FFFD_PATTERN.test(content)) {
            const matches = content.match(FFFD_PATTERN);
            results.push({
                type: 'ENCODING_WARNING',
                message: `UTF-8 디코딩 깨짐 문자() 감지됨 (${matches.length}개)`
            });
        }
        
        // 깨진 한글 패턴 검사
        for (const pattern of BROKEN_KOREAN_PATTERNS) {
            if (pattern.test(content)) {
                const matches = content.match(pattern);
                results.push({
                    type: 'BROKEN_KOREAN',
                    message: `깨진 한글 패턴(${pattern.source}) 감지됨 (${matches.length}개)`
                });
            }
        }
        
    } catch (err) {
        results.push({
            type: 'READ_ERROR',
            message: `파일 읽기 오류: ${err.message}`
        });
        return results;
    }
    
    // 2. JS 파일의 경우 syntax check
    if (path.extname(filePath).toLowerCase() === '.js') {
        try {
            execSync(`node --check "${filePath}"`, { stdio: 'pipe' });
        } catch (err) {
            results.push({
                type: 'SYNTAX_ERROR',
                message: `JS 구문 오류: ${err.stderr.toString().trim()}`
            });
        }
    }
    
    return results;
}

function main() {
    console.log('--- 소스코드 및 문서 파일 검사 시작 ---');
    const files = getFiles(workspaceDir);
    let totalIssues = 0;
    
    for (const file of files) {
        const issues = checkFile(file);
        if (issues.length > 0) {
            console.log(`\n[파일] ${path.relative(workspaceDir, file)}`);
            issues.forEach(issue => {
                console.log(`  - [${issue.type}] ${issue.message}`);
                totalIssues++;
            });
        }
    }
    
    console.log('\n--- 검사 완료 ---');
    console.log(`총 검사한 파일 수: ${files.length}개`);
    console.log(`발견된 이슈 수: ${totalIssues}개`);
}

main();
