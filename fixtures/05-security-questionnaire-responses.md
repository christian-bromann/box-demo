# Acme Corp — Vendor Security Questionnaire Responses

**Audience:** Prospective and existing customers performing vendor due diligence
**Last updated:** 2026-02-10
**Maintained by:** Security & Compliance team
**Classification:** Confidential (share under NDA)

This document provides standardized answers to the most common security questions we receive.

## Company & program

**Q: Do you have a formal information security program?**
Yes. It is governed by our Information Security Policy (SEC-001), owned by the CISO, and reviewed
annually.

**Q: Do you hold any security certifications or attestations?**
Yes — **SOC 2 Type II** (Security, Availability, Confidentiality), clean opinion with zero
exceptions. ISO 27001 is targeted for H2 2026.

## Data protection

**Q: Is data encrypted at rest and in transit?**
Yes. **AES-256 at rest** and **TLS 1.2+ in transit**. Keys are managed in AWS KMS with annual
rotation; BYOK is available on Enterprise.

**Q: Where is data hosted?**
On **AWS**, default region us-east-1. **EU residency (Frankfurt)** is available for Enterprise.

**Q: What is your data retention and deletion policy?**
Customer data is retained for the life of the contract plus 30 days; deletion completes within
**30 days** of termination. See DATA-002 for the full retention schedule.

## Access control

**Q: How is access to customer data controlled?**
Least-privilege access enforced via Okta SSO and mandatory MFA. Production access is time-boxed
and approved per request; access reviews occur quarterly. Departing employees are deprovisioned
within 24 hours.

## Application security

**Q: How do you secure your SDLC?**
Mandatory peer review, automated static analysis, and dependency scanning on every pull request.
No code ships with known critical vulnerabilities.

**Q: Do you perform penetration testing?**
Yes — **annual third-party penetration tests**. Critical findings are remediated within 30 days.
A summary letter is available under NDA.

## Availability & resilience

**Q: What is your uptime SLA?**
**99.9%** contractual uptime; measured **99.95%** in the most recent SOC 2 period. Multi-AZ
architecture with automated failover.

**Q: What are your RTO/RPO targets?**
RTO 4 hours, RPO 1 hour. Last DR drill achieved RTO 1.5 hours and RPO 15 minutes.

## Incident response & breach notification

**Q: Do you have an incident response plan?**
Yes, with a documented runbook and annual tabletop exercises.

**Q: What is your breach notification timeline?**
Affected customers are notified within **72 hours** of a confirmed breach.

## Subprocessors

**Q: Do you use subprocessors?**
Yes. Major subprocessors include **AWS** (hosting), **CloudVault** (encrypted backup &
storage), **Okta** (identity), and **CrowdStrike** (endpoint security). All are reviewed for
SOC 2 / ISO 27001 compliance. A current subprocessor list is available on request.
