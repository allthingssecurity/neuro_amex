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
  ],
};

