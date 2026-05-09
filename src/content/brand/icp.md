# ICP — Target Customer Personas

Enigma serves technical founders building B2B SaaS or AI workflow products. Common traits:
- 1-10 person team
- $0-5M ARR
- Pre-PMF prototype with pull, or post-PMF product that needs a tighter foundation
- Frustrated with previous agency engagements
- Wants weekly shipping without losing ownership of the codebase
- Needs production behavior, not pitch-deck software

## Top Verticals

### 1. Legaltech
Products: contract automation, doc generation, intake, redline workflows, matter triage, compliance review.

Pain language:
- "Our AI demo works until the client uploads the wrong document type."
- "Paralegals still clean everything in a spreadsheet before the app can use it."
- "We need an audit trail before any serious firm will trust this."
- "The workflow changes by practice area and the product does not handle that."

Objections:
- "Legal workflows are too nuanced for a small team."
- "We cannot risk hallucinations in client-facing output."
- "We need to own the IP and review process."

Sample dialogue A:
Founder: "We built intake around a chatbot because it demos well, but firms keep asking where the review trail lives."
Enigma: "The product probably needs structured intake first, then model assistance inside a reviewable path. The audit trail is not a later feature in legaltech. It is the trust layer."

Sample dialogue B:
Founder: "Every contract type has a different exception path. Our current app treats them all the same."
Enigma: "That is a workflow modeling problem before it is an AI problem. Start by naming the states, owners, and escape hatches for each document family."

### 2. Healthtech
Products: patient intake, EHR-adjacent workflows, care navigation, prior auth support, referral operations, clinic admin.

Pain language:
- "Staff still re-enter the same information into three systems."
- "The prototype breaks when a patient skips a required field."
- "We cannot ship anything that creates more work for clinical staff."
- "Integration work is eating the roadmap."

Objections:
- "Healthcare integrations will slow this down."
- "We cannot introduce risk around PHI."
- "Clinicians will not use another dashboard."

Sample dialogue A:
Founder: "The intake flow works in testing, but real patients leave half the form blank."
Enigma: "Then the product needs graceful incompleteness: save state, missing-field detection, staff review, and clear handoff into the system of record."

Sample dialogue B:
Founder: "We want an AI assistant for care coordinators."
Enigma: "Start with the decisions coordinators repeat every day. If the product cannot cite source data and hand off exceptions, the assistant becomes another tab to babysit."

### 3. AI Agency / Tooling
Products: internal automation platforms, client workflow tools, agent dashboards, content ops, sales ops, reporting systems.

Pain language:
- "We sell automations, but every client delivery is still custom glue."
- "The prototype works for one client and collapses for the next."
- "Our team spends more time maintaining scripts than shipping new work."
- "We need to turn services into reusable product surface area."

Objections:
- "We are not ready to productize yet."
- "Every client workflow is different."
- "A custom platform sounds expensive."

Sample dialogue A:
Founder: "We have five client automations that all look different but solve the same operational problem."
Enigma: "That is usually the moment to extract a core workflow: shared states, shared permissions, shared logging, client-specific configuration at the edge."

Sample dialogue B:
Founder: "Our agents work, but we cannot tell why a run failed without reading logs."
Enigma: "You do not need a smarter agent first. You need run history, step-level visibility, retry controls, and a way for a human to resume the work."

## Secondary Verticals
4. Fintech: back-office automation, reconciliation, risk review.
5. SaaS infra: devtools, observability, internal platforms.
6. E-commerce ops automation: inventory, support, fulfillment workflows.
7. Insurance ops: claims intake, underwriting support, document review.
8. Real estate ops: leasing, property workflows, document collection.
9. EdTech: cohort tools, content ops, learner workflows.
10. B2B services automation: logistics, compliance, delivery ops.

## Common Objections
- "Custom is too expensive" -> counter with narrow scope, shipped-in-weeks proof, and code ownership.
- "I want to own the IP" -> we ship code into your repo and document the boundaries.
- "How is this different from a freelancer?" -> senior product engineering, production behavior, and operational handoff included.
- "We already have a prototype" -> useful signal, but the production work starts at edge cases, permissions, observability, and maintainability.
