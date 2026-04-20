# HireX Platform Overview

HireX is a comprehensive, next-generation professional networking and B2B opportunity discovery platform. It is designed to bridge the gap between talented professionals, high-growth startups, and dedicated investors. By merging the social connectivity of a professional network with powerful opportunity-matching mechanics, gamification, and AI-driven insights, HireX provides a unified ecosystem for career growth, capital raising, and enterprise alliances.

---

## 🎯 Core Value Proposition

HireX disrupts traditional networking platforms by natively supporting structured "Opportunities" alongside a standard social feed. Whether you are a startup founder looking for seed funding, an agency seeking procurement contracts, or a developer looking for freelance gigs, HireX categorizes and streamlines the discovery and validation process.

## 🚀 Key Modules & Features

### 1. The Opportunities Discovery Hub
The core engine for B2B and professional growth, partitioned into three main pillars:
*   **Jobs & Gigs (Procurement)**: For full-time roles, freelance tasks, and internships. Supports both fixed-price and milestone-based payment structures.
*   **Funding (Capital)**: A dedicated portal for startups to raise capital (Seed to Series C). Founders can list their total raise, equity offered, and current valuation.
*   **Partnerships (Alliances)**: For finding joint ventures, co-marketing opportunities, and API integrations.

**Features of the Hub:**
*   **AI Research Assistant:** Powered by Groq (LLaMA 3.3 70B), this feature allows investors and candidates to instantly generate structured research briefs on a company. It extracts data such as market positioning, team background, financial viability, and risk factors, offering a direct Q&A interface.
*   **Instant Real-Time Chat:** Users can instantly pivot from viewing an opportunity to a "Live Chat" with the poster to negotiate terms directly.
*   **Verification Badges:** Visual trust indicators confirming that the company posting the opportunity has been formally verified.

### 2. High-Trust Onboarding & Verification
To maintain a high-quality ecosystem, HireX employs a robust, anti-bot multi-step registration flow:
*   **Email OTP:** Standard email verification.
*   **Biometric Liveness Check:** Integrates a Python/FastAPI backend using ML models to perform facial liveness detection, preventing spoofing or bot registration.
*   **DigiLocker Integration Verification:** Simulated Aadhaar/Corporate verification process that rewards users and companies with a "Verified" blue tick, crucial for establishing trust in the Capital and Alliance pillars.

### 3. Professional Social Network
*   **Dynamic Feed:** Users can write posts, share updates, and interact through a modern, LinkedIn-style feed UI.
*   **Rich Profiles:** Highly structured, scrollable professional profiles showcasing skills, experience, and verified statuses.
*   **Connections System:** Build networks, follow industry leaders, and send direct messages via the real-time chat architecture.

### 4. Gamification & Referral Rewards Ecosystem
HireX incentivizes organic growth and user engagement through a built-in economy:
*   **Promo Credits & Wallets:** Users have internal wallets tracking promotional credits earned via referrals or profile completion.
*   **Referral Pipeline:** Generation and tracking of unique referral codes.
*   **Visibility "Boosts":** Users can spend their credits to purchase 24-hour "Boosts" for their posts or profiles, artificially increasing their visibility algorithmic ranking.
*   **Leaderboards:** Gamified global and city-based rankings to drive community engagement.

---

## 💻 Technology Stack

HireX is a robust full-stack application built with modern, scalable technologies.

### Frontend
*   **Framework:** React (using React Router / Vite frontend architecture).
*   **Styling:** Modern, responsive, and highly polished CSS featuring glassmorphism, dynamic animations, and clean topography (Outfit & Inter fonts).
*   **Icons:** Lucide-React.

### Main Backend (Data & API)
*   **Environment:** Node.js with Express.
*   **Database:** MongoDB Atlas (accessed via Mongoose ORM).
*   **Key Data Models:** `User`, `Opportunity`, `Connection`, `Message`, `Conversation`, `Post`, `Transaction`.
*   **AI Integration:** Groq SDK (LLaMA model family) for executing complex entity extraction and summarization prompts.

### Microservices (ML & Verification)
*   **Environment:** Python + FastAPI (running via Uvicorn).
*   **Responsibilities:** Handles machine learning endpoints, such as the Biometric Face Liveness checks utilized during the signup flow.

### Real-Time Communications
*   **Messaging:** Custom messaging schema allowing for unread counts, attached data payloads, and thread histories directly linked to user and company entities.

---

## 🔒 Security & Scaling
*   **Auth:** JWT-based authentication passed via Bearer tokens.
*   **RBAC (Role-Based Access Control):** Differentiates between standard users, verified companies, and recruiters.
*   **Dockerized Deployments:** Designed to be containerized and deployed into AWS production environments.
