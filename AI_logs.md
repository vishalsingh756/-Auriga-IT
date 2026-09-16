# AI Logs

**Project:** Cinema Pricing Engine  
**Date:** 2026-09-16

## Important prompts and outcomes

### Build the pricing engine
> Build a reusable cinema pricing engine for Silver, Gold, and Recliner tiers.
> Handle availability, a flat festival offer, a capped member percentage offer,
> per-ticket convenience fees, GST, exact paisa totals, and a line-by-line bill.

**Outcome:** Added the CommonJS engine, demo scenarios, domain errors, and unit
tests. Money is represented as integer paisa.

### Create the web interface
> Create a webpage so the cinema pricing engine can be used and viewed in a web
> interface.

**Outcome:** Added a React/Vite booking UI backed by the pricing rules in
`cinema-app/src/priceEngine.js`.

### Document the project
> Write brief, important AI logs, reasoning, and a README about the project.

**Outcome:** Reduced the project notes to the decisions, prompts, commands, and
structure needed to understand and run the repository.
