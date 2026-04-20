# 01 Project Index

- Doc Class: Protected Core
- Authority: Master navigation for the current documentation set
- Change Policy: Protected; update only to reflect material doc structure changes
- Status: Active
- Last Updated: 2026-04-04
- Primary Sources: `docs/`; `README.md`

## Purpose
This file is the fastest way to load the current GONEP documentation set without re-running discovery.

## Recommended Loading Order
1. [00_MASTER_CHARTER.md](00_MASTER_CHARTER.md)
2. [02_ARCHITECTURE_MAP.md](02_ARCHITECTURE_MAP.md)
3. [04_BACKEND_CAPABILITY_MAP.md](04_BACKEND_CAPABILITY_MAP.md)
4. [06_AUTH_AND_SECURITY_PLAN.md](06_AUTH_AND_SECURITY_PLAN.md)
5. [09_CURRENT_WORKSTREAMS.md](09_CURRENT_WORKSTREAMS.md)
6. Relevant appendix docs
7. Relevant dev workstream docs under [dev/](dev/)

## Core Docs
| Document | Purpose | Status |
| --- | --- | --- |
| [00_MASTER_CHARTER.md](00_MASTER_CHARTER.md) | Governing charter and operating rules | Active |
| [02_ARCHITECTURE_MAP.md](02_ARCHITECTURE_MAP.md) | Current architecture, route boundaries, and system shape | Active |
| [03_FRONTEND_SOURCE_OF_TRUTH.md](03_FRONTEND_SOURCE_OF_TRUTH.md) | UX contract and frontend preservation rules | Active |
| [04_BACKEND_CAPABILITY_MAP.md](04_BACKEND_CAPABILITY_MAP.md) | Current Django capabilities, admin posture, and backend surface | Active |
| [05_INTEGRATION_STRATEGY.md](05_INTEGRATION_STRATEGY.md) | Rules for future changes on top of the integrated baseline | Active |
| [06_AUTH_AND_SECURITY_PLAN.md](06_AUTH_AND_SECURITY_PLAN.md) | Current browser auth and authorization model | Active |
| [07_API_CONTRACT_MATRIX.md](07_API_CONTRACT_MATRIX.md) | Implemented public API families and portal contract notes | Active |
| [08_FILE_RESPONSIBILITY_LEDGER.md](08_FILE_RESPONSIBILITY_LEDGER.md) | High-signal file ownership and modification notes | Active |
| [09_CURRENT_WORKSTREAMS.md](09_CURRENT_WORKSTREAMS.md) | Active workstreams and next major efforts | Active |
| [10_CHANGELOG_LEDGER.md](10_CHANGELOG_LEDGER.md) | Chronological record of major repo changes | Active |
| [11_RISKS_AND_DECISIONS.md](11_RISKS_AND_DECISIONS.md) | Active risk register and decision ledger | Active |

## Prompts
| Document | Purpose |
| --- | --- |
| [prompts/PROMPT_SYSTEM.md](prompts/PROMPT_SYSTEM.md) | How future prompts should load the docs |
| [prompts/PROMPT_TEMPLATE_MASTER.md](prompts/PROMPT_TEMPLATE_MASTER.md) | Template for broad multi-surface work |
| [prompts/PROMPT_TEMPLATE_TASK.md](prompts/PROMPT_TEMPLATE_TASK.md) | Template for a bounded implementation task |

## Active Dev Workstreams
| Workstream | Purpose | Authority |
| --- | --- | --- |
| [dev/admin-command-centre/00_DEV_INDEX.md](dev/admin-command-centre/00_DEV_INDEX.md) | Reset the Django admin into the Jazmin-based `GONEP Command Centre` | Active |
| [dev/facility-tenancy-uuid-reset/00_DEV_INDEX.md](dev/facility-tenancy-uuid-reset/00_DEV_INDEX.md) | Rebuild the backend around facility-first tenancy and UUID-backed domain identity | Active |

## Appendices
| Document | Purpose |
| --- | --- |
| [appendix/APPENDIX_BACKEND_TREE.md](appendix/APPENDIX_BACKEND_TREE.md) | Current backend structure reference |
| [appendix/APPENDIX_FRONTEND_TREE.md](appendix/APPENDIX_FRONTEND_TREE.md) | Current portal structure reference |
| [appendix/APPENDIX_ENDPOINTS.md](appendix/APPENDIX_ENDPOINTS.md) | Implemented endpoint inventory |
| [appendix/APPENDIX_MODELS.md](appendix/APPENDIX_MODELS.md) | Model-group reference |
| [appendix/APPENDIX_SCREEN_MAP.md](appendix/APPENDIX_SCREEN_MAP.md) | Portal screen map |
| [appendix/APPENDIX_MOCK_DATA_MAP.md](appendix/APPENDIX_MOCK_DATA_MAP.md) | Remaining legacy mock references and cleanup notes |
| [appendix/APPENDIX_ENV_AND_RUNBOOK.md](appendix/APPENDIX_ENV_AND_RUNBOOK.md) | Local environment and run instructions |
