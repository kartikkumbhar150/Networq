# Referral, Rewards & Promo Credits Architecture

This document tracks the complete integration and lifecycle of the incentives ecosystem within HireX, specifically tailored for the 24-hour hackathon benchmark.

## Feature Overview

The incentives platform enables completely automated, multi-tiered organic user pipeline tracking. It directly attaches distinct Promo Credit values recursively against authenticated signups and exposes utility functionality globally enabling physical algorithmic manipulation of elements.

### 1. The Onboarding (Referrals)
- Any verified user natively is allocated a unique 8-character string formatted alphanumeric `referralCode` (ex: `1X9K2ABC`).
- During `Signup`, immediately succeeding the Face Scanning protocol, an optional "Apply Referral Code" input appears embedded strictly in the `Verify Email (OTP)` component.
- During the validation sequence (`POST /verify-otp`), the Node engine decodes this relationship, locates the "Parent" Referrer, and atomically executes a credit transaction giving the parent 500 Promo Credits on the spot natively incrementing their `referralCount`.

### 2. Multi-tier Milestone Engine
- Aside from the 500 Promo Credits baseline, mapping thresholds exists:
  - **5 Referrals:** +2,500 Credits + 'Connector' Badge
  - **10 Referrals:** +5,000 Credits + 'Bronze Networker' Badge
  - **25 Referrals:** +15,000 Credits + 'Silver Influencer' Badge
  - **50 Referrals:** +40,000 Credits + 'Gold Ambassador' Badge
- These milestone pushes are completely mechanically parsed upon the precise increment resolving the ledger flawlessly!

### 3. The Ledger Ecosystem (Transactions)
- We mounted a native `Transaction` schema holding chronological, immutable mappings of every credit delta globally indexing `['milestone', 'topup', 'referral', 'boost']`. 

## Feature Implementations (Wallet & Leaderboard)

### Top-Up functionality
- Found inside `/wallet`, developers can access a pseudo-Stripe simulation converting generic mock inputs mathematically into Promo Credit payloads mapping exactly across `POST /rewards/topup`.

### Basic Boost Mechanism
- Consumes precisely 1,000 Promo Credits dynamically executing `POST /rewards/boost`.
- Resolves mapping strings identifying `entityType` (`post`, `event`, `profile`, `company`) and its `entityId`.
- Updates the artifact schema dropping an identical `boostedUntil` Unix Date payload natively ensuring front-end discovery/algorithm loops can boost their sort weights identically for precisely 24 hours.
- A physical `BoostButton.tsx` acts as the React anchor dropping directly into: The global Feed, The Events UI map, and specific Dynamic User Profiles.

### Gamification Leaderboards
- Natively built `/leaderboards` fetching active datasets routing endpoints rendering 3 distinct global rankings:
  1. `Global Referrals` (Raw descending counts globally).
  2. `City Referrals` (Regex queries masking exact matches matching geographical user payloads).
  3. `Total 1000 First Verified` (Direct chronological tracking determining the initial platform bootstrappers!). 

## Administrative Features natively exposed
- Navigational dashboard mapped to `/admin-rewards`.
- Fetches all universal native log pipelines identically mirroring `rewards/transactions?admin=true`.
- Allows specific payload injection firing `POST /rewards/mega-gift` to immediately dispense any literal description string securely directly against the target userId logging the immutable transaction payload elegantly. 

## Endpoints Created
- `POST /api/rewards/boost` (Spend)
- `POST /api/rewards/topup` (Fund)
- `GET /api/rewards/leaderboard` (Index)
- `GET /api/rewards/transactions` (Logs)
- `GET /api/rewards/me` (Profile stats)
- `POST /api/rewards/admin/mega-gift` (Super-user)

## Yet to Implement
- Advanced Tiers (Platinum/Diamond scaling)
- Granular Boost options (1Hr vs 7-Day scaling pricing)
- Reverse-matching (Reward the referee securely based on regional logic rather than solely the referring node).
