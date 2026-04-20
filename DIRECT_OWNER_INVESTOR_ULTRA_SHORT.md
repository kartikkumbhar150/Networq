# DIRECT OWNER-TO-INVESTOR TRUST - ULTRA SHORT

## Problem
Fraudsters fake founders, insert middlemen, redirect funds.

## Solution
Verify owner → Verify rep authorization → Verify investor talks to real rep → Lock bank account → Execute safely

---

## PHASE 1: DATABASE & VERIFICATION

### CompanyRepresentative
```
companyId, userId, representativeType (founder|director|authorized_rep|employee)
authorizationScope: [can_pitch_investment, can_execute_investment]
verificationStatus: pending_verification | verified | revoked
bankAccountAuthorized, bankAccountDetails (encrypted)
```

### InvestmentProposal
```
companyId, createdBy (CompanyRepresentative._id NOT User._id)
proposalTitle, investmentAmount, equityOffering, investmentType
status: draft | active | owner_verified | investment_completed
investorsInvolved: [userId array]
creatorVerificationCheckpoint: boolean (investor verified rep is real?)
bankAccountForInvestment: { account, ifscCode, verified }
fraudFlags: [{ flagType, severity }]
```

### DirectCommunicationSession
```
investmentProposalId, companyId, companyRepId, investorId
sessionType: platform_messaging | video_call
encryptedMessages: [{ senderId, messageBody (encrypted), timestamp }]
investorVerificationCheckpoint: { investorConfirmsRealRep, timestamp }
```

---

## PHASE 2: CORE WORKFLOWS

### registerFounder(userId, companyId, proof)
```
1. Check isFaceVerified === true
2. Check company verified
3. Create CompanyRepresentative type=founder, status=pending
4. Send to admin for verification
```

### createInvestmentProposal(representativeId, companyId, data)
```
1. Check rep has can_pitch_investment authorization
2. Create proposal with createdBy=representativeId
3. Status: draft
```

### investorVerifiesRepresentative(proposalId, investorAnswers)
```
CRITICAL: This prevents imposter scams

1. Investor answers 4 questions about:
   - Founder name
   - Company legal name
   - Rep's role
   - Company founding date
2. If >= 3 correct: creatorVerificationCheckpoint = true
3. If < 3: Flag as potential imposter, escalate to admin
```

### executeInvestment(proposalId, investorId, amount)
```
1. Check creatorVerificationCheckpoint === true
2. Check rep has can_execute_investment authorization
3. Check investment bank account === company's verified bank account
4. Create investment record, status: pending_confirmation
5. Both founder + investor must confirm before fund transfer
6. On both confirm: transfer funds, log to audit trail
```

---

## PHASE 3: SAFETY CHECKS & ANTI-MIDDLEMAN

### detectMiddleman(representativeId, proposalId)
```
Red flags (each = block or flag):
✗ Requesting upfront fees → BLOCK immediately
✗ Multiple unrelated companies → FLAG
✗ Bank account mismatch → FLAG
✗ Founder not communicating → FLAG
✗ Asking investor to pay separately → BLOCK

Calculate riskScore: each flag +20 points
If >= 60: Potential middleman, freeze proposal
```

### validateBankAccount(proposalId, bankDetails)
```
CRITICAL: Investment ONLY to company's verified account

1. Get company's verified bank account
2. Compare with investment bank account
3. If mismatch: FLAG + FREEZE + ESCALATE
```

### reportFraud(representativeId, proposalId, description)
```
1. Create incident report
2. FREEZE representative's accounts immediately
3. Check all rep's proposals for fraud
4. Notify admin
5. Initiate investor refunds
```

---

## API ENDPOINTS

**User:**
- POST /api/investment/create-proposal
- POST /api/investment/proposals/:id/invite-investors
- POST /api/investment/proposals/:id/verify-rep ← INVESTOR VERIFIES HERE
- POST /api/investment/proposals/:id/execute-investment
- POST /api/investment/proposals/:id/confirm-investment
- POST /api/incidents/report-fraud
- GET /api/investment/proposals/:id/audit-trail

**Admin:**
- POST /api/admin/representatives/:id/verify
- GET /api/admin/investment/escalations
- POST /api/admin/escalations/:id/review

---

## CRITICAL CHECKPOINTS

1. Investor answers 4 questions about rep (must get 3/4 correct)
2. Investment bank account must match company's verified account
3. Both founder + investor must confirm investment
4. Any upfront fee request = BLOCK
5. All communications encrypted + logged

---

## FILE STRUCTURE

```
/models/
  CompanyRepresentative.js
  InvestmentProposal.js
  DirectCommunicationSession.js

/services/
  founderVerificationService.js
  middlemanDetectionService.js
  fraudDetectionService.js

/controllers/
  investmentProposalController.js
  investmentExecutionController.js

/routes/
  investment.js
  adminInvestment.js
```

---

## KEY IMPLEMENTATION NOTES

- createdBy = CompanyRepresentative._id (not User._id)
- Investor verification (4 questions) = CRITICAL CHECKPOINT
- Bank account matching = NON-NEGOTIABLE
- Encrypt all messages
- Block upfront fees immediately
- Freeze first if fraud suspected
- Log everything for audit trail

---

## TESTING

□ Founder registers → admin approves
□ Rep created → founder + admin approve
□ Proposal created by verified rep only
□ Investor invited → opens proposal
□ Investor answers questions correctly → rep verified
□ Investor answers wrong → flagged as imposter
□ Middleman tries fee → BLOCKED
□ Bank account mismatch → BLOCKED
□ Both confirm → funds transfer
□ Fraud reported → immediate freeze + refund

---

## BUILD ORDER

1. Create 3 models (30 mins)
2. Create 3 controllers + 3 services (1.5 hours)
3. Create 10 API endpoints (1 hour)
4. Implement verification checkpoint (45 mins)
5. Implement bank account validation (30 mins)
6. Implement middleman detection (45 mins)
7. Testing (1 hour)

Total: ~6 hours for full feature

