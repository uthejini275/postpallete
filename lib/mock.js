// Used only in test mode (MOCK_AI=1 and no API key), so the site can be tried without spending money.
export const MOCK_DECK = {
  title: "Test deck: Ohm's Law",
  subject: "Basic Electrical Engineering",
  summary: "This is a test deck returned in test mode, so no AI was used. Current through a conductor is proportional to the voltage across it at constant temperature. Resistors add directly in series, and their reciprocals add in parallel.",
  topics: [
    { title: "Ohm's Law", importance: "must", points: ["Current is directly proportional to voltage at constant temperature.", "The constant is resistance R."], formula: "V = I × R", example: "10 Ω with 2 A gives 20 V.", trick: "VIR: Very Important Rule" },
    { title: "Resistors in series", importance: "must", points: ["Same current through each resistor.", "Total is larger than the largest one."], formula: "R = R1 + R2 + R3", example: "", trick: "" },
    { title: "Resistors in parallel", importance: "good", points: ["Same voltage across each branch.", "Total is smaller than the smallest one."], formula: "1/R = 1/R1 + 1/R2", example: "Two 6 Ω in parallel = 3 Ω.", trick: "Parallel = more Pathways" }
  ],
  flashcards: [
    { q: "State Ohm's law.", a: "At constant temperature, V = IR." },
    { q: "Two 4 Ω resistors in parallel?", a: "2 Ω." }
  ],
  quiz: [
    { q: "Three 3 Ω resistors in parallel give:", options: ["9 Ω", "1 Ω", "3 Ω", "6 Ω"], answer: 1, why: "1/R = 1/3 + 1/3 + 1/3 = 1." }
  ],
  examTips: ["Write the formula before substituting.", "Check your units."]
};
