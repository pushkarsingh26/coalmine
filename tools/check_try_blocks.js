const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, '..', 'script.js');
const src = fs.readFileSync(file, 'utf8');

function findTryBlocks(s) {
  const tries = [];
  const re = /\btry\s*\{/g;
  let m;
  while ((m = re.exec(s)) !== null) {
    const startIdx = m.index;
    const braceIdx = s.indexOf('{', m.index);
    if (braceIdx === -1) continue;
    // find matching closing brace respecting strings and comments
    let i = braceIdx;
    let depth = 0;
    let inSingle = false, inDouble = false, inBack = false, inLineComment = false, inBlockComment = false;
    for (; i < s.length; i++) {
      const ch = s[i];
      const prev = s[i-1];
      if (inLineComment) {
        if (ch === '\n') inLineComment = false;
        continue;
      }
      if (inBlockComment) {
        if (prev === '*' && ch === '/') inBlockComment = false;
        continue;
      }
      if (!inSingle && !inDouble && !inBack) {
        if (ch === '/' && s[i+1] === '/') { inLineComment = true; i++; continue; }
        if (ch === '/' && s[i+1] === '*') { inBlockComment = true; i++; continue; }
      }
      if (!inLineComment && !inBlockComment) {
        if (!inDouble && !inBack && ch === '\'') { inSingle = !inSingle; continue; }
        if (!inSingle && !inBack && ch === '"') { inDouble = !inDouble; continue; }
        if (!inSingle && !inDouble && ch === '`') { inBack = !inBack; continue; }
      }
      if (inSingle || inDouble || inBack) continue;
      if (ch === '{') depth++; else if (ch === '}') {
        depth--; if (depth === 0) break;
      }
    }
    if (depth !== 0) {
      tries.push({ start: startIdx, braceStart: braceIdx, braceEnd: -1, issue: 'unbalanced braces' });
      continue;
    }
    const braceEnd = i;
    // skip whitespace/comments after braceEnd to find next token
    let j = braceEnd + 1;
    while (j < s.length && /[\s\n\r\t]/.test(s[j])) j++;
    // if next few chars start with 'catch' or 'finally'
    const nextChunk = s.slice(j, j+10);
    const hasCatch = /^catch\b/.test(nextChunk);
    const hasFinally = /^finally\b/.test(nextChunk);
    if (!hasCatch && !hasFinally) {
      // record line/col
      const before = s.slice(Math.max(0, startIdx-80), startIdx+80);
      const line = s.slice(0, startIdx).split('\n').length;
      tries.push({ start: startIdx, braceStart, braceEnd, issue: 'missing catch/finally', line, context: before });
    }
  }
  return tries;
}

const issues = findTryBlocks(src);
if (issues.length === 0) {
  console.log('OK: no try-blocks missing catch/finally detected.');
} else {
  console.log('Found issues:');
  issues.forEach((it, idx) => {
    console.log(`- Issue ${idx+1}: ${it.issue} at line ${it.line}`);
    console.log(it.context.replace(/\n/g,'\\n'));
    console.log('----');
  });
}
// don't exit with non-zero so the run_in_terminal tool shows output
process.exit(0);
