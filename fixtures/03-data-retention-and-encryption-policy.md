# Acme Corp — Data Retention & Encryption Policy

**Policy ID:** DATA-002
**Version:** 3.0
**Effective date:** 2026-02-01
**Owner:** CISO & Data Protection Officer (DPO)
**Classification:** Internal

## 1. Encryption

### Data at rest

- All customer data stored in FlowState is encrypted at rest using **AES-256**.
- Database volumes, object storage (backups, file uploads), and disk snapshots are encrypted.
- Encryption keys are managed in **AWS KMS** with automatic annual key rotation. Customer-managed
  keys (CMK / BYOK) are available on the Enterprise plan.

### Data in transit

- All data in transit is encrypted using **TLS 1.2 or higher**. TLS 1.0 and 1.1 are disabled.
- Internal service-to-service traffic within the production VPC is encrypted with mutual TLS.

## 2. Data retention

| Data type | Retention period | Notes |
| --- | --- | --- |
| Customer workflow data | Life of contract + **30 days** | Deleted within 30 days of termination |
| Application & audit logs | **13 months** | Supports security investigations and SOC 2 |
| Backups | **35 days** rolling | Encrypted, geo-redundant |
| Support tickets | **3 years** | |
| Marketing / prospect data | **24 months** of inactivity | Then purged or anonymized |
| Employee HR records | Per legal requirement (typically **7 years**) | |

## 3. Data deletion

- On contract termination, customer data is deleted within **30 days**, and certified deletion
  is available on request for Enterprise customers.
- Individual data-subject deletion requests (GDPR / CCPA) are fulfilled within **30 days**.

## 4. Data classification

| Level | Examples | Handling |
| --- | --- | --- |
| Restricted | Customer PII, secrets, credentials | Encrypted, access logged, MFA required |
| Confidential | Contracts, financials, source code | Internal access only, least privilege |
| Internal | Policies, runbooks, roadmaps | All employees |
| Public | Marketing site, docs | No restriction |

## 5. Data residency

- The default production region is **AWS us-east-1 (N. Virginia)**.
- **EU data residency (eu-central-1, Frankfurt)** is available for Enterprise customers with
  data-residency requirements.

## 6. Compliance alignment

This policy supports Acme Corp's **SOC 2 Type II** program and our commitments under **GDPR**
and **CCPA**. See the *SOC 2 Readiness Report* and *Security Questionnaire Responses* for
control-level detail.
