// Quick accuracy harness for the advisor engine (Phase 1).
// Run: node tools/test-advisor.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'advisor.js'), 'utf8');

// minimal DOM shims so the IIFE can run headless
global.window = {};
global.document = {
  readyState: 'complete',
  getElementById: () => null,
  querySelectorAll: () => [],
  addEventListener: () => {}
};
eval(src);
const A = global.window.CopilotAdvisor;

const cases = [
  ["Summarize what I missed in yesterday's meetings", 'chat'],
  ['What is our latest guidance on data retention?', 'chat'],
  ['Draft an email to my manager about the delay', 'chat'],
  ["Find the deck from last quarter's business review", 'chat'],
  ['Brainstorm ideas for our offsite agenda', 'chat'],
  ['Analyze this spreadsheet and tell me the trend', 'chat'],
  ['Do deep research on the competitive landscape with sources', 'chat'],

  ['Prep for my customer meeting: pull emails, calendar and recent files into a briefing doc, an Excel overview and a client-ready deck', 'cowork'],
  ['Create a briefing document and a presentation for the exec review', 'cowork'],
  ['Draft the email and then send it to the marketing team', 'cowork'],
  ['Organize my inbox and file everything into folders', 'cowork'],
  ['Analyze 6 months of usage data and produce a leadership-ready report and a deck', 'cowork'],

  ['Build a small web app that tracks our project intake', 'code'],
  ['Write a python script to clean up this CSV', 'code'],
  ['Refactor this function and fix the failing unit test', 'code'],

  ['Send me a status summary every Monday morning automatically', 'scout'],
  ['Monitor my inbox while I am away and alert me when something urgent arrives', 'scout'],
  ['I want something always-on that manages my day and lets others book time with me', 'scout'],

  ['My whole team needs to run the same onboarding workflow the same way every time with approved sources', 'agent'],
  ['Build a custom agent in Copilot Studio for HR questions', 'agent'],
  ['A reusable self-service tool the whole department can use with governance and guardrails', 'agent']
];

let pass = 0;
const fails = [];
cases.forEach(([text, want]) => {
  const r = A.recommend(text);
  const got = r.primary.id;
  if (got === want) pass++;
  else fails.push({ text, want, got, conf: r.confidence, scores: r.scores.map(s => s.id + ':' + s.v.toFixed(1)).join(' ') });
});

console.log(`PASS ${pass}/${cases.length}`);
if (fails.length) {
  console.log('\nFAILURES:');
  fails.forEach(f => {
    console.log(`  "${f.text.slice(0, 72)}"`);
    console.log(`     want=${f.want} got=${f.got} conf=${f.conf}  [${f.scores}]`);
  });
}
