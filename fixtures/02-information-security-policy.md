# Acme Corp — Information Security Policy

**Policy ID:** SEC-001
**Version:** 4.2
**Effective date:** 2026-01-15
**Owner:** Chief Information Security Officer (CISO)
**Review cadence:** Annual
**Classification:** Internal

## 1. Purpose

This policy defines how Acme Corp protects the confidentiality, integrity, and availability of
company and customer information across the FlowState platform and all corporate systems.

## 2. Scope

Applies to all employees, contractors, and third parties who access Acme Corp systems or data.

## 3. Access control

- Access is granted on a **least-privilege**, need-to-know basis.
- **Single sign-on (SSO)** via Okta is mandatory for all internal applications.
- **Multi-factor authentication (MFA)** is required for all employees and for any access to
  production systems.
- Production access requires a separate, time-boxed elevation approved by an engineering
  manager and the security team. Standing production access is prohibited.
- Access reviews are performed **quarterly**; access is revoked within **24 hours** of an
  employee's departure.

## 4. Endpoint security

- All company laptops use full-disk encryption (FileVault / BitLocker) and run a managed EDR
  agent (CrowdStrike).
- Automatic OS patching is enforced; critical patches must be applied within **7 days**.

## 5. Network & application security

- All external traffic is served over **TLS 1.2+**.
- Web application firewall (WAF) and DDoS protection are enabled at the edge.
- Static and dependency scanning run on every pull request; no code ships with known
  critical vulnerabilities.
- Annual third-party **penetration tests** are conducted; findings are remediated on a
  risk-based schedule (critical within 30 days).

## 6. Incident response

- Security incidents are reported to `security@acme.example` and tracked in our incident
  management system.
- The incident response team follows a documented runbook: **detect → triage → contain →
  eradicate → recover → post-mortem**.
- Customers are notified of any confirmed data breach affecting their data within **72 hours**,
  consistent with contractual and regulatory obligations.

## 7. Vendor & third-party risk

- All vendors that process Acme or customer data undergo a security review before onboarding.
- Vendors handling sensitive data must hold SOC 2 Type II or ISO 27001 certification.
- See the *Data Retention & Encryption Policy* (DATA-002) for data-handling specifics.

## 8. Enforcement

Violations of this policy may result in disciplinary action up to and including termination.
Exceptions require written approval from the CISO.
