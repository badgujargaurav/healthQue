const fs = require('fs');
const path = 'd:/My Projects/healthQue/healthQue-backend/controllers/profileController.js'.replace(/\\/g,'/');
const src = fs.readFileSync(path,'utf8');
let line = 1, col = 0;
let brace = 0, paren = 0, bracket = 0;
let inSingle = false, inDouble = false, inBack = false;
let inCommentLine = false, inCommentBlock = false, prev = '';
const braceStack = [];
for (let i=0;i<src.length;i++){
  const ch = src[i];
  if (ch === '\n') { line++; col=0; inCommentLine=false; }
  col++;
  if (inCommentLine) { prev = ch; continue; }
  if (inCommentBlock){
    if (prev === '*' && ch === '/') inCommentBlock=false;
    prev = ch; continue;
  }
  if (!inSingle && !inDouble && !inBack){
    if (ch === '/' && src[i+1]==='/') { inCommentLine=true; i++; prev=''; continue; }
    if (ch === '/' && src[i+1]==='*') { inCommentBlock=true; i++; prev=''; continue; }
  }
  if (!inSingle && !inDouble && ch === '`' && !inBack) { inBack = true; prev=ch; continue; }
  else if (inBack && ch === '`' && prev !== '\\') { inBack = false; prev=ch; continue; }
  if (!inBack && !inDouble && ch === "'" && !inSingle) { inSingle = true; prev=ch; continue; }
  else if (inSingle && ch === "'" && prev !== '\\') { inSingle = false; prev=ch; continue; }
  if (!inBack && !inSingle && ch === '"' && !inDouble) { inDouble = true; prev=ch; continue; }
  else if (inDouble && ch === '"' && prev !== '\\') { inDouble = false; prev=ch; continue; }
  if (inSingle || inDouble || inBack) { prev = ch; continue; }
  if (ch === '{') { brace++; braceStack.push({line, col}); }
  if (ch === '}') { brace--; braceStack.pop(); }
  if (ch === '(') paren++;
  if (ch === ')') paren--;
  if (ch === '[') bracket++;
  if (ch === ']') bracket--;
  if (brace < 0 || paren < 0 || bracket < 0) { console.log('IMBALANCE at', line, col, 'brace', brace, 'paren', paren, 'bracket', bracket); process.exit(1); }
}
console.log('FINAL', 'brace', brace, 'paren', paren, 'bracket', bracket, 'inBack', inBack, 'inSingle', inSingle, 'inDouble', inDouble);

if (brace > 0 && braceStack.length) {
  const last = braceStack[braceStack.length-1];
  console.log('Last unmatched { at', last.line, 'col', last.col);
}
