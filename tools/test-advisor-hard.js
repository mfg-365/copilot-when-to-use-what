// Adversarial cases — phrasings NOT written to match the signal table.
// Run: node tools/test-advisor-hard.js
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'assets', 'advisor.js'), 'utf8');
global.window = {};
global.document = { readyState: 'complete', body: { insertAdjacentHTML: () => {} },
  getElementById: () => null, querySelectorAll: () => [], addEventListener: () => {} };
eval(src);
const A = global.window.CopilotAdvisor;

// [input, acceptable answers]
const cases = [
  ['who owns the pricing model for EMEA?', ['chat']],
  ['make my calendar less awful', ['chat', 'scout']],
  ['turn these meeting notes into a polished summary', ['chat']],
  ['I need a picture of a robot for slide 3', ['chat']],
  ['compare our Q1 and Q2 numbers', ['chat']],
  ['what changed in the contract since last version', ['chat']],

  ['put together everything I need for the QBR next week', ['cowork', 'chat']],
  ['pull the numbers, write it up, and share it with the exec team', ['cowork']],
  ['clean up my OneDrive and reorganize the folders', ['cowork']],
  ['take my rough notes and turn them into a doc, a one-pager and slides', ['cowork']],
  ['respond to all the vendor emails and log them', ['cowork']],

  ['stand up a dashboard that reads from our SQL database', ['code']],
  ['I need a REST endpoint that validates webhooks', ['code']],
  ['automate this with a scheduled powershell job', ['code', 'scout']],

  ['keep an eye on the support queue overnight', ['scout']],
  ['I want it working when I am not at my desk', ['scout']],
  ['handle my scheduling for me going forward', ['scout']],
  ['every morning give me a briefing before my first call', ['scout']],

  ['something the sales org can all use the same way', ['agent']],
  ['package this so other people do not have to re-prompt it', ['agent']],
  ['a governed assistant for policy questions with approved sources only', ['agent']],

  ['help', ['chat']],
  ['idk what to use', ['chat']],
  ['make a deck', ['chat', 'cowork']]
];

let pass = 0;
const fails = [];
cases.forEach(([text, want]) => {
  const r = A.recommend(text);
  const got = r.primary.id;
  if (want.includes(got)) pass++;
  else fails.push({ text, want: want.join('|'), got, conf: r.confidence, scores: r.scores.map(s => s.id + ':' + s.v.toFixed(1)).join(' ') });
});

console.log(`HARD PASS ${pass}/${cases.length}`);
if (fails.length) {
  console.log('\nFAILURES:');
  fails.forEach(f => {
    console.log(`  "${f.text}"`);
    console.log(`     want=${f.want} got=${f.got} conf=${f.conf}  [${f.scores}]`);
  });
}
