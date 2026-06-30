# Acme Corp — SOC 2 Type II Readiness Report

**Prepared by:** Security & Compliance team
**Auditor:** Beacon Assurance LLP (independent)
**Report period:** 2025-07-01 to 2025-12-31
**Trust Services Criteria in scope:** Security, Availability, Confidentiality
**Classification:** Confidential

## Executive summary

Acme Corp completed its **SOC 2 Type II** examination for the period covering the second half of
2025. The auditor issued an **unqualified ("clean") opinion** with **zero exceptions** across the
in-scope criteria. The next observation period begins **2026-01-01**, and the current report is
valid for sharing with customers under NDA.

## Trust Services Criteria — status

| Criteria | Status | Notes |
| --- | --- | --- |
| Security (Common Criteria) | Met | No exceptions |
| Availability | Met | 99.95% measured uptime; documented DR plan |
| Confidentiality | Met | Encryption + data classification enforced |
| Processing Integrity | Not in scope | Planned for 2026 |
| Privacy | Not in scope | GDPR/CCPA covered operationally |

## Key controls tested

- **CC6.1 — Logical access:** SSO + MFA enforced; quarterly access reviews evidenced.
- **CC6.6 — Encryption:** AES-256 at rest, TLS 1.2+ in transit (see DATA-002).
- **CC7.2 — Monitoring:** Centralized logging with 13-month retention; alerting on anomalies.
- **CC7.3 — Incident response:** Documented runbook; tabletop exercise completed Q4 2025.
- **A1.2 — Availability:** Multi-AZ deployment; backups tested via quarterly restore drills.
- **CC8.1 — Change management:** All changes via pull request with peer review and CI gates.

## Availability metrics (report period)

| Metric | Target | Actual |
| --- | --- | --- |
| Uptime | 99.9% | **99.95%** |
| RTO (recovery time objective) | 4 hours | 1.5 hours (last drill) |
| RPO (recovery point objective) | 1 hour | 15 minutes |

## Open items / roadmap

1. Add **Processing Integrity** criteria to the 2026 scope.
2. Pursue **ISO 27001** certification in H2 2026.
3. Automate quarterly access-review evidence collection.

## How to share

The full SOC 2 report and bridge letter are available to customers and prospects **under NDA**.
Requests go through the security team at `security@acme.example`.
