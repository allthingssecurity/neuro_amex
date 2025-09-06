// Example inputs per flow
window.DEMO_EXAMPLES = {
  auth: [
    {
      id: "auth_low_risk",
      label: "Low risk, within available (approve_no_otp)",
      text: "Please approve this $120 purchase at MCC 5999. Card present. My available balance shows $500 and my limit is $1000. Risk score is 0.30 and only 1 txn in the last hour.",
    },
    {
      id: "auth_cnp_borderline",
      label: "CNP borderline (approve_with_otp)",
      text: "Online purchase for $200. Card not present. MCC 5732. My limit is 1000, available 600. Risk is 0.50. Velocity 1 in the last hour.",
    },
    {
      id: "auth_cnp_high_risk",
      label: "CNP high risk (decline)",
      text: "Please approve an online purchase for $500. Not card present. MCC 5999. Risk score 0.62, velocity last hour 2. Limit 1000, available 450.",
    },
    {
      id: "auth_forbidden_mcc",
      label: "Forbidden MCC (decline)",
      text: "Online $50 at MCC 7995 (adult services). Risk is 0.20, limit 1000, available 900. Card not present.",
    },
    {
      id: "auth_velocity_breach",
      label: "Velocity cap breach (decline)",
      text: "Three online purchases in the last hour, this one is $40. Card not present. MCC 5999. Risk 0.20. Velocity last hour 6. Limit 500, available 460.",
    },
  ],
  dispute: [
    {
      id: "dispute_late",
      label: "Duplicate charge but filed late (decline)",
      text: "I was billed twice on May 1 for my hotel. I'm filing the claim today on September 15.",
    },
    {
      id: "dispute_timely",
      label: "Duplicate charge timely (route RC-4834)",
      text: "I was billed twice last week for groceries. Filing today.",
    },
    {
      id: "dispute_other",
      label: "Non-duplicate (request docs)",
      text: "The merchant charged me an extra tip that I don't recognize. This was last month.",
    },
  ],
  cli: [
    {
      id: "cli_delinquent",
      label: "CLI with delinquency (decline)",
      text: "Can you raise my limit to 10,000? I've been with Amex for a year, my income is 40,000 USD. I missed two payments last quarter.",
    },
    {
      id: "cli_ok",
      label: "CLI acceptable (approve)",
      text: "Please raise my limit to 7000. I'm with Amex for 2 years. Income is 60,000. No missed payments. Current limit is 5000.",
    },
    {
      id: "cli_income_ratio",
      label: "Exceeds income ratio (decline)",
      text: "Raise my limit to 20000 please. Income is 50,000. Current limit 5000. No missed payments. With Amex 3 years.",
    },
    {
      id: "cli_low_tenure",
      label: "Low tenure (decline)",
      text: "Can you increase my limit to 8000? I joined 3 months ago. Income is 60,000. No delinquencies.",
    },
  ],
};
