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

