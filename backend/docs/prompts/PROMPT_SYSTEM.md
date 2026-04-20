# Prompt System

- Doc Class: Prompt Guidance
- Authority: How future prompts should load and use the docs
- Change Policy: Update when the documentation operating model changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `docs/00_MASTER_CHARTER.md`; `docs/01_PROJECT_INDEX.md`; `docs/09_CURRENT_WORKSTREAMS.md`

## Default Loading Order
1. `docs/00_MASTER_CHARTER.md`
2. `docs/01_PROJECT_INDEX.md`
3. The most relevant current-state docs for the task
4. The relevant appendix docs
5. The relevant dev workstream docs under `docs/dev/` if a large internal reset is active

## Prompt Rule
Future prompts should describe the current system and current workstream context directly. They should not assume a roadmap phase or milestone document exists.

## Update Rule
After implementation, update the relevant living docs, appendices, changelog, and dev workstream docs if system reality changed.
