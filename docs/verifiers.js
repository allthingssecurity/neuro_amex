// Simple JS verifiers that mirror solver constraints for demo purposes

const AUTH_POLICY = {
  invariants: [
    { name: "limit_ok", check: f => f.amount <= f.limit },
    { name: "risk_ceiling", check: f => f.risk <= 0.80 },
    { name: "cnp_tightened", check: f => (f.cnp ? f.risk <= 0.55 : true) },
    { name: "velocity_cap", check: f => f.vel1h <= 5 },
    { name: "mcc_allowed", check: f => ![4829, 7995].includes(f.mcc) },
  ],
  actions: [
    { name: "approve_no_otp", guard: f => f.amount <= f.avail && f.risk <= 0.35 },
    { name: "approve_with_otp", guard: f => f.amount <= f.limit && f.risk <= 0.55 },
    { name: "decline", guard: f => f.risk > 0.55 || f.amount > f.limit || f.vel1h > 5 },
  ],
};

function explainAuth(action, f, proof) {
  if (proof.satisfiable) {
    if (action === "approve_no_otp") return "Approved without OTP: low risk and within available balance.";
    if (action === "approve_with_otp") return `Approved with OTP because risk=${f.risk} \u2264 0.55, amount \u2264 limit, velocity within cap.`;
    return "Declined.";
  } else {
    const ex = (proof.unsat_core || []).map(s => "`" + s + "`").join("; ");
    return `Declined: violated ${ex}.`;
  }
}

function verifyAuth(facts) {
  const invs = AUTH_POLICY.invariants.map(iv => ({ name: iv.name, ok: safeCheck(() => iv.check(facts)) }));
  const unsat = invs.filter(i => !i.ok).map(i => i.name);
  const satisfiable = unsat.length === 0;

  let chosen = null;
  if (satisfiable) {
    const guards = AUTH_POLICY.actions.map(a => ({ name: a.name, ok: safeCheck(() => a.guard(facts)) }));
    // one-hot by priority order
    chosen = (guards.find(g => g.ok) || { name: "decline" }).name;
  }

  return {
    satisfiable,
    chosen_action: chosen,
    checked_invariants: invs.map(i => i.name),
    unsat_core: unsat,
  };
}

function verifyDispute(f) {
  const invs = [
    { name: "refund_window", ok: f.days_since_txn != null ? f.days_since_txn <= 120 : true },
  ];
  const unsat = invs.filter(i => !i.ok).map(i => i.name);
  const satisfiable = unsat.length === 0;
  let decision = "request_more_docs";
  if (satisfiable) {
    if (f.duplicate_charge) decision = "rc_4834";
  }
  const explanation = satisfiable ? (decision === "rc_4834" ? "Route to duplicate charge reason code (4834)." : "Request additional documents.") : "Declined: dispute outside allowed window.";
  return { satisfiable, decision, explanation, checked_invariants: invs.map(i => i.name), unsat_core: unsat };
}

function verifyCLI(f) {
  const invs = [
    { name: "min_tenure", ok: (f.tenure_months ?? 0) >= 6 },
    { name: "no_delinquency", ok: !Boolean(f.delinquent) },
    { name: "within_income_ratio", ok: f.amount_requested != null && f.income != null ? f.amount_requested <= f.income * 0.3 : true },
    { name: "not_below_current_limit", ok: f.amount_requested != null && f.current_limit != null ? f.amount_requested >= f.current_limit : true },
  ];
  const unsat = invs.filter(i => !i.ok).map(i => i.name);
  const satisfiable = unsat.length === 0;
  const decision = satisfiable ? "approve" : "decline";
  const explanation = satisfiable ? "Approved: satisfies tenure, delinquency, and income constraints." : `Declined due to: ${unsat.join(", ")}`;
  return { satisfiable, decision, explanation, checked_invariants: invs.map(i => i.name), unsat_core: unsat };
}

function safeCheck(fn) {
  try { return !!fn(); } catch { return false; }
}

window.DEMO_VERIFIERS = { verifyAuth, explainAuth, verifyDispute, verifyCLI };

// Program builders: SMT-like textual representation for demo
function smtVal(v) {
  if (v === null || v === undefined) return "?";
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (Number.isFinite(v)) return v.toString();
  return JSON.stringify(v);
}

function buildAuthProgram(f) {
  const decls = [
    '(declare-const amount Real)',
    '(declare-const avail Real)',
    '(declare-const limit Real)',
    '(declare-const risk Real)',
    '(declare-const vel1h Int)',
    '(declare-const mcc Int)',
    '(declare-const cnp Bool)',
    '(declare-const approve_no_otp Bool)',
    '(declare-const approve_with_otp Bool)',
    '(declare-const decline Bool)'
  ];
  const assigns = [
    `(assert (= amount ${smtVal(f.amount)}))`,
    `(assert (= avail ${smtVal(f.avail)}))`,
    `(assert (= limit ${smtVal(f.limit)}))`,
    `(assert (= risk ${smtVal(f.risk)}))`,
    `(assert (= vel1h ${smtVal(f.vel1h)}))`,
    `(assert (= mcc ${smtVal(f.mcc)}))`,
    `(assert (= cnp ${smtVal(f.cnp)}))`,
  ];
  const invs = [
    '(assert (! (<= amount limit) :named limit_ok))',
    '(assert (! (<= risk 0.80) :named risk_ceiling))',
    '(assert (! (=> cnp (<= risk 0.55)) :named cnp_tightened))',
    '(assert (! (<= vel1h 5) :named velocity_cap))',
    '(assert (! (and (distinct mcc 4829) (distinct mcc 7995)) :named mcc_allowed))',
  ];
  const guards = [
    '(assert (=> approve_no_otp (and (<= amount avail) (<= risk 0.35))))',
    '(assert (=> approve_with_otp (and (<= amount limit) (<= risk 0.55))))',
    '(assert (=> decline (or (> risk 0.55) (> amount limit) (> vel1h 5))))',
    '(assert (or approve_no_otp approve_with_otp decline))',
  ];
  return [...decls, '', ...assigns, '', ...invs, '', ...guards].join('\n');
}

function buildDisputeProgram(f) {
  const decls = [
    '(declare-const duplicate_charge Bool)',
    '(declare-const days_since_txn Int)',
    '(declare-const reason_code Int)'
  ];
  const assigns = [
    `(assert (= duplicate_charge ${smtVal(f.duplicate_charge)}))`,
    `(assert (= days_since_txn ${smtVal(f.days_since_txn)}))`,
  ];
  const rules = [
    '(assert (! (=> duplicate_charge (= reason_code 4834)) :named dup_maps_rc))',
    '(assert (! (<= days_since_txn 120) :named refund_window))',
  ];
  return [...decls, '', ...assigns, '', ...rules].join('\n');
}

function buildCLIProgram(f) {
  const decls = [
    '(declare-const amount_requested Real)',
    '(declare-const current_limit Real)',
    '(declare-const income Real)',
    '(declare-const tenure_months Int)',
    '(declare-const delinquent Bool)'
  ];
  const assigns = [
    `(assert (= amount_requested ${smtVal(f.amount_requested)}))`,
    `(assert (= current_limit ${smtVal(f.current_limit)}))`,
    `(assert (= income ${smtVal(f.income)}))`,
    `(assert (= tenure_months ${smtVal(f.tenure_months)}))`,
    `(assert (= delinquent ${smtVal(f.delinquent)}))`,
  ];
  const rules = [
    '(assert (! (>= tenure_months 6) :named min_tenure))',
    '(assert (! (not delinquent) :named no_delinquency))',
    '(assert (! (<= amount_requested (* income 0.3)) :named within_income_ratio))',
    '(assert (! (>= amount_requested current_limit) :named not_below_current_limit))',
  ];
  return [...decls, '', ...assigns, '', ...rules].join('\n');
}

window.DEMO_PROGRAMS = { buildAuthProgram, buildDisputeProgram, buildCLIProgram };
