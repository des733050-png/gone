# Docs Reset Spec

- Doc Class: Dev Docs Spec
- Authority: Active plan for removing phase-mode from the root docs
- Change Policy: Update if the docs reset scope changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `docs/`; `README.md`

## Reset Goal
Move the root docs from a completed phase/milestone program to present-state operational documentation and active workstreams.

## Required Changes
- Remove `Current Phase` metadata from active docs.
- Remove roadmap-first and milestone-first loading instructions.
- Remove `docs/milestones/*` as active authority.
- Replace `docs/09_PHASE_ROADMAP.md` with a current workstreams document.
- Update prompt docs to load current-state docs and active workstream docs instead of roadmap/milestone trackers.
- Keep historical context only where it still helps present-state understanding.

## Current-State Authority Set
- charter
- project index
- architecture map
- frontend source of truth
- backend capability map
- integration strategy
- auth and security plan
- API contract matrix
- file responsibility ledger
- current workstreams
- changelog
- risks and decisions
- appendices
- active dev workstream docs when a reset or large internal refactor is underway
