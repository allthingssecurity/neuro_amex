/* global DEMO_EXAMPLES, DEMO_VERIFIERS */

const flowEl = document.getElementById('flow');
const inputEl = document.getElementById('inputText');
const factsOut = document.getElementById('factsOut');
const decisionBox = document.getElementById('decisionBox');
const explanationBox = document.getElementById('explanationBox');
const invariantsOut = document.getElementById('invariantsOut');
const unsatOut = document.getElementById('unsatOut');
const autoRunToggle = document.getElementById('autoRunToggle');
const programOut = document.getElementById('programOut');
const speedSel = document.getElementById('speed');
const progressBar = document.getElementById('progressBar');

const stepLLM = document.getElementById('step-llm');
const stepVerify = document.getElementById('step-verify');
const stepExplain = document.getElementById('step-explain');
const tLLM = document.getElementById('t-llm');
const tVerify = document.getElementById('t-verify');
const tExplain = document.getElementById('t-explain');

function setExamples(flow) {
  const list = document.getElementById('examplesList');
  list.innerHTML = '';
  const examples = DEMO_EXAMPLES[flow] || [];
  const listToUse = examples.length ? examples : [{ label: 'Sample prompt', text: 'Online $120, card not present. Risk 0.4, limit 1000, available 600. MCC 5999. 2 purchases last hour.' }];
  listToUse.forEach(ex => {
    const btn = document.createElement('button');
    btn.className = 'example-btn';
    btn.innerHTML = `<span class="label">${ex.label}</span>`;
    btn.addEventListener('click', () => {
      inputEl.value = ex.text;
      if (autoRunToggle.checked) runPipeline();
    });
    list.appendChild(btn);
  });
}

function pretty(obj) {
  try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
}

function parseMoney(text) {
  const m = text.match(/\$\s*(\d+[\d,]*(?:\.\d+)?)/i);
  return m ? parseFloat(m[1].replace(/,/g, '')) : null;
}

function extractAuthFacts(text) {
  const t = text.toLowerCase();
  const amount = parseMoney(text);
  const riskMatch = t.match(/risk\s*(?:score)?\s*(?:is|=)?\s*(\d+(?:\.\d+)?)/);
  const risk = riskMatch ? parseFloat(riskMatch[1]) : null;
  const availMatch = t.match(/available\s*(?:balance)?\s*(?:shows|is|=)?\s*\$?(\d+[\d,]*(?:\.\d+)?)/);
  const avail = availMatch ? parseFloat(availMatch[1].replace(/,/g, '')) : null;
  const limitMatch = t.match(/limit\s*(?:is|=)?\s*\$?(\d+[\d,]*(?:\.\d+)?)/);
  const limit = limitMatch ? parseFloat(limitMatch[1].replace(/,/g, '')) : null;
  const mccMatch = t.match(/mcc\s*(\d{4})/);
  const mcc = mccMatch ? parseInt(mccMatch[1], 10) : 5999;
  const cnp = t.includes('card not present') || t.includes('online') || t.includes('not card present');
  const velMatch = t.match(/velocity.*?(\d+)/) || t.match(/last\s+hour.*?(\d+)/) || t.match(/(\d+)\s+txn/);
  const vel1h = velMatch ? parseInt(velMatch[1], 10) : 1;
  return { amount, avail, limit, risk, mcc, cnp, vel1h };
}

function daysBetween(iso1, iso2) {
  try {
    const d1 = new Date(iso1); const d2 = new Date(iso2);
    return Math.round((d2 - d1) / (1000*60*60*24));
  } catch { return null; }
}

function extractDisputeFacts(text) {
  const t = text.toLowerCase();
  const duplicate_charge = t.includes('billed twice') || t.includes('duplicate');
  // crude date parsing for demo
  const monthMap = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
  function findDate(s) {
    const m = s.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s*(\d{1,2})/i);
    if (!m) return null;
    const now = new Date();
    return new Date(now.getFullYear(), monthMap[m[1].slice(0,3).toLowerCase()], parseInt(m[2],10));
  }
  const txnD = findDate(text) || new Date();
  const claimD = new Date();
  const days_since_txn = daysBetween(txnD.toISOString(), claimD.toISOString());
  return { duplicate_charge, txn_date: txnD.toISOString().slice(0,10), claim_date: claimD.toISOString().slice(0,10), days_since_txn };
}

function extractCLIFacts(text) {
  const t = text.toLowerCase();
  const amount_requested = parseMoney(text);
  const incomeMatch = t.match(/income\s*(?:is|=)?\s*\$?(\d+[\d,]*(?:\.\d+)?)/);
  const income = incomeMatch ? parseFloat(incomeMatch[1].replace(/,/g, '')) : null;
  const limitMatch = t.match(/current\s+limit\s*(?:is|=)?\s*\$?(\d+[\d,]*(?:\.\d+)?)/);
  const current_limit = limitMatch ? parseFloat(limitMatch[1].replace(/,/g, '')) : 5000;
  const tenureMatch = t.match(/(\d+)\s*(?:months|month|m)|(?:year|years)\b/);
  let tenure_months = 12;
  if (tenureMatch) {
    if (tenureMatch[1]) tenure_months = parseInt(tenureMatch[1], 10);
    if (t.includes('year')) tenure_months = Math.max(tenure_months, 12);
  }
  const delinquent = t.includes('missed') || t.includes('late payment');
  return { amount_requested, current_limit, income, tenure_months, delinquent };
}

function extractFacts(flow, text) {
  if (flow === 'auth') return extractAuthFacts(text);
  if (flow === 'dispute') return extractDisputeFacts(text);
  if (flow === 'cli') return extractCLIFacts(text);
  return {};
}

function runVerifier(flow, facts) {
  if (flow === 'auth') {
    const proof = DEMO_VERIFIERS.verifyAuth(facts);
    const decision = proof.satisfiable ? (proof.chosen_action || 'decline') : 'decline';
    const explanation = DEMO_VERIFIERS.explainAuth(decision, facts, proof);
    return { decision, explanation, proof };
  }
  if (flow === 'dispute') {
    const r = DEMO_VERIFIERS.verifyDispute(facts);
    return { decision: r.decision, explanation: r.explanation, proof: r };
  }
  if (flow === 'cli') {
    const r = DEMO_VERIFIERS.verifyCLI(facts);
    return { decision: r.decision, explanation: r.explanation, proof: r };
  }
  return { decision: 'decline', explanation: 'Unknown flow', proof: { satisfiable: false, checked_invariants: [], unsat_core: [] } };
}

function setDecision(dec) {
  decisionBox.textContent = dec;
  decisionBox.classList.remove('ok', 'bad', 'warn');
  if (dec.includes('approve')) decisionBox.classList.add('ok');
  else decisionBox.classList.add('bad');
}

function clearResults() {
  factsOut.textContent = '';
  programOut.textContent = '';
  setDecision('—');
  explanationBox.textContent = '';
  invariantsOut.textContent = '';
  unsatOut.textContent = '';
}

function setStep(el, state, durText) {
  el.classList.remove('running', 'done', 'error');
  el.querySelector('.status').textContent = state;
  if (durText) el.querySelector('.duration').textContent = ` ${durText}`;
  if (state === 'running') el.classList.add('running');
  if (state === 'done') el.classList.add('done');
  if (state === 'error') el.classList.add('error');
}

function speedFactor() {
  switch (speedSel.value) {
    case 'fast': return 0.6;
    case 'normal': return 1.0;
    case 'slow': return 1.8;
    case 'vslow': return 2.6;
    default: return 1.0;
  }
}

function setProgress(pct) {
  progressBar.style.width = `${Math.max(0, Math.min(100, pct))}%`;
}

async function animateProgressTo(targetPct, durationMs) {
  progressBar.style.transition = `width ${durationMs}ms linear`;
  requestAnimationFrame(() => setProgress(targetPct));
  await delay(durationMs);
}

async function runPipeline() {
  clearResults();
  const flow = flowEl.value;
  const text = inputEl.value.trim();
  // Reset progress
  progressBar.style.transition = 'none';
  setProgress(0);

  // Step 1: LLM
  setStep(stepLLM, 'running');
  const t0 = performance.now();
  const f = speedFactor();
  const llmDur = Math.round(rand(1200, 2000) * f);
  animateProgressTo(35, llmDur);
  await delay(llmDur);
  let facts;
  try {
    facts = extractFacts(flow, text);
    factsOut.textContent = pretty(facts);
    setStep(stepLLM, 'done', fmtMs(performance.now() - t0));
  } catch (e) {
    setStep(stepLLM, 'error', fmtMs(performance.now() - t0));
    return;
  }

  // Step 2: Verifier
  // Show compiled program before running
  try {
    if (flow === 'auth') programOut.textContent = window.DEMO_PROGRAMS.buildAuthProgram(facts);
    else if (flow === 'dispute') programOut.textContent = window.DEMO_PROGRAMS.buildDisputeProgram(facts);
    else if (flow === 'cli') programOut.textContent = window.DEMO_PROGRAMS.buildCLIProgram(facts);
  } catch (e) { programOut.textContent = ''; }

  setStep(stepVerify, 'running');
  const t1 = performance.now();
  const verDur = Math.round(rand(800, 1500) * f);
  animateProgressTo(85, verDur);
  await delay(verDur);
  const res = runVerifier(flow, facts);
  setDecision(res.decision);
  explanationBox.textContent = res.explanation;
  invariantsOut.textContent = pretty(res.proof.checked_invariants || []);
  unsatOut.textContent = pretty(res.proof.unsat_core || []);
  setStep(stepVerify, 'done', fmtMs(performance.now() - t1));

  // Step 3: Explanation (already rendered)
  setStep(stepExplain, 'running');
  const t2 = performance.now();
  const expDur = Math.round(rand(500, 900) * f);
  await animateProgressTo(100, expDur);
  setStep(stepExplain, 'done', fmtMs(performance.now() - t2));
}

function delay(ms){ return new Promise(r => setTimeout(r, ms)); }
function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }
function fmtMs(ms){ return `${Math.round(ms)}ms`; }

// Init
setExamples(flowEl.value);
flowEl.addEventListener('change', () => {
  setExamples(flowEl.value);
  clearResults();
});
document.getElementById('runPipeline').addEventListener('click', runPipeline);
document.getElementById('reset').addEventListener('click', () => {
  inputEl.value = '';
  clearResults();
  [stepLLM, stepVerify, stepExplain].forEach(s => setStep(s, 'idle', ''));
});
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') runPipeline();
});
// Load first example and auto-run
const first = (DEMO_EXAMPLES[flowEl.value]||[])[0];
if (first) { inputEl.value = first.text; runPipeline(); }
