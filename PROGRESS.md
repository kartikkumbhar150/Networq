# HireX Platform — Complete Implementation Progress

> **Last Updated:** April 19, 2026  
> **Status:** Production-Ready (Local Development)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Authentication & Identity Verification](#2-authentication--identity-verification)
3. [Multi-Step Signup Flow](#3-multi-step-signup-flow)
4. [Social Feed System](#4-social-feed-system)
5. [Real-Time Chat & WebSockets](#5-real-time-chat--websockets)
6. [Professional Networking & Connections](#6-professional-networking--connections)
7. [User Profile System](#7-user-profile-system)
8. [Events & Smart Attendance System](#8-events--smart-attendance-system)
9. [Opportunities Board](#9-opportunities-board)
10. [Referral, Rewards & Promo Credits](#10-referral-rewards--promo-credits)
11. [Leaderboard](#11-leaderboard)
12. [AI / ML Microservice (Python)](#12-ai--ml-microservice-python)
13. [UI/UX Design System](#13-uiux-design-system)
14. [Infrastructure & DevOps](#14-infrastructure--devops)
15. [File & Directory Map](#15-file--directory-map)

---

## 1. Architecture Overview

HireX is a **three-service microservices architecture** designed for a professional networking and hiring platform:

| Service | Technology | Port | Purpose |
|---------|-----------|------|---------|
| **Backend API** | Express.js + TypeScript | `5000` | REST APIs, WebSocket server, business logic |
| **Frontend** | React Router v7 (Remix) + TypeScript | `5173` | Single-page application with SSR-capable routing |
| **ML Service** | FastAPI + Python | `8000` | Face liveness detection, embedding generation, vector search |

**Databases:**
- **MongoDB** — Primary data store for users, posts, connections, events, messages, transactions
- **Qdrant** — Vector database for storing and searching 512-dimensional facial embeddings

Both databases are containerized via `docker-compose.yml` with persistent volumes.

---

## 2. Authentication & Identity Verification

### 2.1 Email/Password Authentication
- **Login endpoint** (`POST /api/auth/login`) — Supports dual login types (`user` and `company`) with bcrypt password hashing
- **JWT tokens** — Issued on successful login, stored in `localStorage`, sent as `Authorization: Bearer` headers
- **Session management** — Express sessions with `cookie-parser` for OAuth flows

### 2.2 OAuth 2.0 Social Login
- **Google OAuth** — Passport.js Google Strategy (`/api/auth/google`) with callback handling
- **GitHub OAuth** — Passport.js GitHub Strategy (`/api/auth/github`) with callback handling
- Both strategies auto-create user accounts on first login and issue JWT tokens

### 2.3 Face Biometric Liveness Verification
- **ArcFace Embeddings** — DeepFace library generates 512-dimensional face embeddings from webcam captures
- **Qdrant Vector Search** — On signup, the system checks if any existing embedding is within cosine distance threshold (0.4), preventing one person from creating multiple accounts
- **Liveness Challenge** — The `<FaceCapture />` component generates random challenges (smile, turn head, blink) that the user must complete to prove they are a live person, not a photo
- **MediaPipe Integration** — `@mediapipe/tasks-vision` runs real-time face landmark detection in the browser to validate challenge completion (mouth open = smile, head angle = turn, eye aspect ratio = blink)

### 2.4 DigiLocker Identity Verification
- **Simulated Aadhaar Verification** — A demo endpoint (`POST /api/auth/digilocker/demo-verify`) simulates the DigiLocker Aadhaar verification flow
- **Verified Badge** — Users who complete DigiLocker verification receive `isVerifiedUser: true` on their profile, displayed as an orange checkmark throughout the platform
- **Company Verification** — Companies are verified against `verified_companies.csv` using CIN lookup, granting `isVerifiedCompany: true`

### 2.5 OTP Email Verification
- **Nodemailer Integration** — Asynchronous email delivery of 6-digit OTP codes to verify email ownership during signup
- **IPv4-first DNS** — `dns.setDefaultResultOrder('ipv4first')` fixes ENETUNREACH on systems with broken IPv6
- **OTP Validation** — `POST /api/auth/verify-otp` validates the code, creates the verified user account, processes referral codes, and issues JWT

### 2.6 JWT Middleware
- **`auth.ts` middleware** — Extracts and validates JWT from `Authorization` header, attaches `req.user` with decoded payload
- Used on all protected routes (feed, chat, connections, profile, events, etc.)

---

## 3. Multi-Step Signup Flow

The signup process is a **5-step wizard**:

| Step | Name | What Happens |
|------|------|--------------|
| 1 | **Details** | User fills name, email, password. Company accounts provide CIN/GSTIN. Data is sent to `POST /api/auth/signup` which creates a `PendingUser` and sends OTP |
| 2 | **Verify Email** | 6-digit OTP input. On success, `PendingUser` is promoted to `User` in MongoDB. JWT is issued |
| 3 | **Face Scan** | Webcam-based liveness challenge. On pass, embedding is stored in Qdrant. The face is linked to this account permanently |
| 4 | **DigiLocker** | Optional Aadhaar identity verification. Grants a Verified Badge. Can be skipped |
| 5 | **Done** | Celebration screen with redirect to `/feed` |

**Data Models:**
- `PendingUser.ts` — Temporary storage during signup (email, hashed password, OTP, expiry)
- `User.ts` — Full user schema with profile, connections, wallet, verification flags, referral codes, badges, boost status

---

## 4. Social Feed System

### 4.1 Feed Page (`/feed`)
- **Two-column layout** — Main content column (post composer + feed) and right sidebar (trending/suggested)
- **Post Composer** — Rich text input with image upload support. Posts are created via `POST /api/feed/posts`
- **Infinite Feed** — All posts fetched from `GET /api/feed/posts` with populated author data, sorted by recency and boost status

### 4.2 Post Interactions
- **Likes** — Toggle like/unlike with optimistic UI updates. Like count displayed on each post
- **Comments** — Expandable comment section per post. Comments fetched and submitted inline
- **Boost** — Boosted posts (via promo credits) receive elevated positioning in the feed
- **Author Info** — Each post displays author avatar, name, headline, and verified badge

### 4.3 PostCard Component
- `<PostCard />` — 15KB component rendering individual posts with:
  - Author header with avatar, name, verification badge, and timestamp
  - Post content with image support
  - Like button with count  
  - Comment button with expandable reply thread
  - Boost indicator for promoted posts

---

## 5. Real-Time Chat & WebSockets

### 5.1 WebSocket Server
- **`ws` library** — Native WebSocket server initialized on the same HTTP server as Express
- **`chat-ws.ts`** — Manages WebSocket connections, message routing, typing indicators, and presence
- **Connection tracking** — Maps `userId` to active WebSocket connections for targeted message delivery

### 5.2 Chat Interface (`/chat`)
- **Dual-pane layout** — Conversation list on the left, active chat on the right
- **Real-time messaging** — Messages appear instantly via WebSocket push, no polling required
- **Typing indicators** — `<TypingIndicator />` component shows when the other person is typing
- **Read receipts** — Double-check marks (✓✓) indicate message delivery and read status
- **Unread counts** — Badge on the sidebar "Messages" link shows total unread messages, polled every 30 seconds

### 5.3 Chat Components
- `<ChatBubble />` — Individual message rendering with timestamps, delivery status, and alignment (sent/received)
- `<ConversationListItem />` — Sidebar item showing last message preview, unread count, and online status

### 5.4 Chat API
- `GET /api/chat/conversations/:userId` — List all conversations for a user
- `POST /api/chat/messages` — Send a message (also broadcast via WebSocket)
- `GET /api/chat/messages/:conversationId` — Fetch message history
- `GET /api/chat/unread/:userId` — Get total unread message count

---

## 6. Professional Networking & Connections

### 6.1 Connection System
- **4-state model** — Connections exist in states: `none`, `pending`, `accepted`, `rejected`
- **Direction tracking** — Each pending request tracks `sender` and `receiver` for proper UI (show Accept/Reject vs. Withdraw)

### 6.2 Connection API (`/api/connections`)
- `POST /request` — Send a connection request
- `POST /:id/respond` — Accept or reject a pending request
- `POST /:id/withdraw` — Withdraw a sent request
- `DELETE /:id` — Remove an existing connection
- `GET /:userId/list` — Get all accepted connections
- `GET /:userId/pending` — Get all pending incoming requests

### 6.3 Unified Network Page (`/network`)
- **Three-tab interface:**
  - **My Network** — Grid of accepted connections with remove button
  - **Invitations** — List of pending incoming requests with Accept/Reject actions
  - **Discover People** — Search bar with debounced query, displays matching users as cards with Connect/Withdraw/Accept buttons
- **`<UserCard />`** — Reusable component showing user avatar, name, role, and context-aware action button
- **`<ConnectionRequestCard />`** — Shows incoming request with sender info and Accept/Reject buttons

### 6.4 Search
- `GET /api/users/search?query=` — Full-text search across user names, headlines, and account types
- **Debounced input** — 300ms debounce on search queries to reduce API calls

---

## 7. User Profile System

### 7.1 Own Profile (`/profile`)
- **Comprehensive profile page** (51KB) with:
  - Editable cover photo and profile photo (base64 upload)
  - Name, headline, bio, location editing
  - Skills management (add/remove tags)
  - Experience section (add/edit/remove entries with company, role, dates)
  - Education section (add/edit/remove entries)
  - Post history
  - Wallet and promo credits display

### 7.2 Public Profile (`/profile/:userId`)
- **Read-only view** of another user's profile
- Shows their posts, experience, education, skills
- Connection status button (Connect / Pending / Connected)
- Message button to start a chat

### 7.3 Profile API
- `GET /api/users/:id/profile` — Fetch full profile with connection count, post count
- `PUT /api/profile/update` — Update profile fields (headline, bio, skills, experience, education, photos)

---

## 8. Events & Smart Attendance System

### 8.1 Event Management
- **Event creation** (`/events/create`) — Title, description, date, location, capacity, escrow amount, image
- **Event listing** (`/events`) — Grid of upcoming events with status, capacity, and registration info
- **Event detail** (`/events/:id`) — Full event page with description, map placeholder, attendee list, and registration

### 8.2 Escrow & Registration
- **Escrow commitment** — Users registering for an event must commit promo credits as an escrow deposit
- **QR code generation** — Each registration generates a unique QR code for attendance verification
- **`Registration.ts` model** — Tracks user, event, escrow amount, QR data, check-in status

### 8.3 Attendance Scanning (`/events/scan`)
- **QR scanner** — Verified companies can scan attendee QR codes via webcam
- **Check-in validation** — Backend verifies the QR, marks the user as physically present
- **Escrow release** — Checked-in users get their escrow refunded; no-shows forfeit theirs

### 8.4 Automated Cron Worker
- **`scheduler.ts`** — Node.js cron job runs periodically checking for expired events
- **24-hour post-event processing** — Auto-refunds present attendees, penalizes ghosts by liquidating their escrow

---

## 9. Opportunities Board

### 9.1 Job Listings (`/opportunities`)
- **Company-only posting** — Only accounts with `isVerifiedCompany: true` can create job opportunities
- **Listing display** — Cards showing company name, role, location, description, requirements
- **Application flow** — Users can view and apply to opportunities

### 9.2 Opportunity API
- `GET /api/opportunities` — List all active opportunities
- `POST /api/opportunities` — Create a new opportunity (verified companies only)

---

## 10. Referral, Rewards & Promo Credits

### 10.1 Referral System
- **Referral code generation** — Every user gets a unique referral code (e.g., `OM-PUNE-7X9K2`) upon account creation
- **Referral redemption** — New users can enter a referral code during OTP verification step
- **Reward distribution** — Referrer receives **500 promo credits** when their referral code is used

### 10.2 Wallet & Credits
- **Promo credit balance** — Tracked on the `User.promoCredits` field
- **Transaction ledger** — `Transaction.ts` model records every credit operation (earn, spend, referral, boost, escrow)
- **Wallet display** — Visible on the profile page showing balance and recent transactions

### 10.3 Milestone Badges
- **Automatic badge awards** at referral milestones:
  - 5 referrals → Badge
  - 10 referrals → Badge  
  - 25 referrals → Badge
  - 50 referrals → Badge
- Badges stored in `User.badges` array and displayed on profile

### 10.4 24-Hour Boost
- **Post boost** — Pay promo credits to boost a post for 24 hours, elevating it in the feed
- **Profile boost** — Pay credits to boost your profile visibility for 24 hours
- **Event boost** — Pay credits to boost event visibility
- **Backend tracking** — `User.boostExpiry` field tracks when the boost expires

### 10.5 Admin Tools
- **Mega Gift Admin** (`/admin-rewards`) — Admin interface for manually distributing promo credits to any user by ID
- **Custom gift descriptions** — Each gift can include a reason/description

### 10.6 Rewards API (`/api/rewards`)
- `GET /wallet/:userId` — Get balance, transactions, badges
- `POST /boost` — Activate a 24-hour boost
- `POST /admin/mega-gift` — Admin credit distribution

---

## 11. Leaderboard

### 11.1 Leaderboard Page (`/leaderboard`)
- **Global ranking** — Users ranked by promo credit balance and referrals
- **Real-time data** — Fetched from the backend on page load
- **Visual ranking** — Top 3 highlighted with special styling, remaining users in a clean table

---

## 12. AI / ML Microservice (Python)

### 12.1 FastAPI Server (`main.py`)
- **Endpoints:**
  - `POST /liveness` — Receives base64 face image, extracts embedding via DeepFace/ArcFace, checks Qdrant for duplicates, stores new embedding
  - `POST /verify-face` — Verifies a face against stored embeddings for biometric login
  - Health check endpoint for monitoring

### 12.2 Face Utilities (`face_utils/`)
- **`liveness.py`** — DeepFace wrapper for ArcFace model. Extracts 512-dim embeddings from face images, handles error cases (no face detected, multiple faces)
- **`qdrant_store.py`** — Qdrant client wrapper:
  - `store_embedding(user_id, embedding)` — Stores a face embedding vector linked to a user ID
  - `search_similar(embedding, threshold)` — Searches for matching faces within cosine distance
  - `delete_embedding(user_id)` — Removes an embedding
  - Collection management with cosine distance metric

### 12.3 Dependencies
- DeepFace, OpenCV, NumPy for face processing
- Qdrant client for vector database operations
- FastAPI + Uvicorn for HTTP serving

---

## 13. UI/UX Design System

### 13.1 Design Language — "Premium Orange & White"
The platform uses a **clean, minimalist, professional** design system:

| Token | Value | Usage |
|-------|-------|-------|
| `--accent-from` | `#F26522` | Primary orange — buttons, active states, logo |
| `--accent-to` | `#E85D10` | Darker orange for hover states |
| `--accent-light` | `#FFF7ED` | Light orange tint for backgrounds |
| `--bg-base` | `#F8F9FA` | Page background |
| `--bg-card` | `#FFFFFF` | Card backgrounds |
| `--text-primary` | `#1A1A1A` | Headings, body text |
| `--text-secondary` | `#6B7280` | Labels, secondary info |
| `--text-muted` | `#9CA3AF` | Placeholder, hint text |
| `--border` | `#E5E7EB` | Card borders, dividers |

### 13.2 Typography
- **Headings** — `Outfit` (Google Fonts) — weights 700-900
- **Body** — `Inter` (Google Fonts) — weights 400-600
- Both loaded via `@import` in `app.css`

### 13.3 Component Library
| Component | File | Description |
|-----------|------|-------------|
| `<Sidebar />` | `Sidebar.tsx` | Fixed left navigation with profile card, nav links, sign out |
| `<Navbar />` | `Navbar.tsx` | Top navigation bar for unauthenticated pages |
| `<PostCard />` | `PostCard.tsx` | Feed post with author, content, likes, comments |
| `<UserCard />` | `UserCard.tsx` | User card for network discovery/connections |
| `<ConnectionRequestCard />` | `ConnectionRequestCard.tsx` | Pending invitation with accept/reject |
| `<ChatBubble />` | `ChatBubble.tsx` | Individual chat message |
| `<ConversationListItem />` | `ConversationListItem.tsx` | Chat sidebar conversation preview |
| `<FaceCapture />` | `FaceCapture.tsx` | Webcam face capture with liveness challenges |
| `<ThreeCanvas />` | `ThreeCanvas.tsx` | Three.js 3D particle network animation on homepage |
| `<TypingIndicator />` | `TypingIndicator.tsx` | Animated typing dots for chat |

### 13.4 Sidebar Design
- **Profile card at top** — Avatar (with profile photo support), name, headline, connection count, post count
- **Navigation links** — Feed, Messages (with unread badge), Leaderboard, My Network, Opportunities, Events, Profile
- **Sign out** at bottom — Flat button turning red on hover
- **280px fixed width**, clean white background, `#EBEBEB` borders

### 13.5 Auth Pages (Login / Signup)
- **Clean white card** centered on `#F8F9FA` background
- **Underline tab switcher** for Individual/Company toggle
- **Flat inputs** with `#EBEBEB` borders, orange focus ring
- **"OR" divider** between email and social login
- **Social buttons** — White with thin border, hover to `#F9F9F9`
- **No glass effects, no gradients, no shadows** — purely flat and minimal

### 13.6 Three.js Homepage Animation
- **`<ThreeCanvas />`** — Custom WebGL animation with:
  - Central rotating icosahedron with orange wireframe
  - 300+ floating particles with random velocities
  - Mouse-reactive — particles respond to cursor position
  - Connecting lines drawn between nearby particles
  - Renders on the hero section of the landing page

---

## 14. Infrastructure & DevOps

### 14.1 Docker Compose
```yaml
services:
  mongodb:    # MongoDB instance with persistent volume
  qdrant:     # Qdrant vector DB with persistent volume
```

### 14.2 Backend Utilities
| File | Purpose |
|------|---------|
| `email.ts` | Nodemailer configuration for OTP delivery with HTML email templates |
| `escrow.ts` | Escrow commit/release/liquidation logic for event attendance |
| `extractInterests.ts` | Extracts user interests from profile for recommendation matching |
| `fastapi.ts` | HTTP client for calling the Python ML service |
| `passport.ts` | Google + GitHub OAuth strategy configuration |
| `qr.ts` | QR code generation utility for event attendance |
| `scheduler.ts` | Cron job for automated post-event escrow processing |
| `verifyCompany.ts` | CIN lookup against `verified_companies.csv` for company verification |

### 14.3 Frontend Routing (`routes.ts`)
All 15 routes configured via React Router v7:

| Route | File | Auth Required |
|-------|------|---------------|
| `/` | `home.tsx` | No |
| `/login` | `login.tsx` | No |
| `/signup` | `signup.tsx` | No |
| `/feed` | `feed.tsx` | Yes |
| `/chat` | `chat.tsx` | Yes |
| `/network` | `network.tsx` | Yes |
| `/profile` | `profile.tsx` | Yes |
| `/profile/:userId` | `profile.$userId.tsx` | Yes |
| `/leaderboard` | `leaderboard.tsx` | Yes |
| `/opportunities` | `opportunities.tsx` | Yes |
| `/events` | `events.tsx` | Yes |
| `/events/create` | `events.create.tsx` | Yes |
| `/events/:id` | `events.$id.tsx` | Yes |
| `/events/scan` | `events.scan.tsx` | Yes (Company) |
| `/admin-rewards` | `admin-rewards.tsx` | Yes (Admin) |

---

## 15. File & Directory Map

```
DevClash_HireX/
├── docker-compose.yml          # MongoDB + Qdrant containers
├── PROGRESS.md                 # This file
├── README-referral-rewards.md  # Referral system documentation
├── verification.readme         # Verification system documentation
│
├── backend/                    # Express.js + TypeScript API
│   └── src/
│       ├── index.ts            # Server entry — Express, WebSocket, routes
│       ├── db/init.ts          # MongoDB connection + seed data
│       ├── middleware/auth.ts  # JWT authentication middleware
│       ├── models/
│       │   ├── User.ts         # Full user schema (profile, wallet, badges)
│       │   ├── PendingUser.ts  # Temporary signup state
│       │   ├── Post.ts         # Feed posts with likes, comments
│       │   ├── Connection.ts   # Network connections (4-state)
│       │   ├── Conversation.ts # Chat conversations
│       │   ├── Message.ts      # Chat messages
│       │   ├── Event.ts        # Events with escrow
│       │   ├── Registration.ts # Event registrations + QR
│       │   ├── Opportunity.ts  # Job opportunities
│       │   └── Transaction.ts  # Promo credit ledger
│       ├── routes/
│       │   ├── auth.ts         # Login, signup, OTP, OAuth, liveness, DigiLocker
│       │   ├── feed.ts         # Posts CRUD, likes, comments
│       │   ├── chat.ts         # Conversations, messages, unread counts
│       │   ├── connections.ts  # Connection requests, responses, listing
│       │   ├── users.ts        # User search, profile fetching
│       │   ├── profile.ts      # Profile update
│       │   ├── events.ts       # Event CRUD
│       │   ├── registrations.ts # Event registration, QR scan, check-in
│       │   ├── opportunities.ts # Job opportunity CRUD
│       │   └── rewards.ts      # Wallet, boost, admin gifts
│       ├── utils/
│       │   ├── email.ts        # Nodemailer OTP delivery
│       │   ├── escrow.ts       # Event escrow logic
│       │   ├── passport.ts     # OAuth strategies
│       │   ├── scheduler.ts    # Cron job for escrow processing
│       │   ├── qr.ts           # QR code generation
│       │   ├── verifyCompany.ts # CIN verification
│       │   ├── fastapi.ts      # ML service HTTP client
│       │   └── extractInterests.ts # Interest extraction
│       └── ws/
│           └── chat-ws.ts      # WebSocket server for real-time chat
│
├── frontend/                   # React Router v7 (Remix) SPA
│   └── app/
│       ├── app.css             # Global design system (800+ lines)
│       ├── root.tsx            # App shell with Sidebar layout
│       ├── routes.ts           # Route configuration
│       ├── components/
│       │   ├── Sidebar.tsx     # Fixed left nav with profile card
│       │   ├── Navbar.tsx      # Top nav for public pages
│       │   ├── PostCard.tsx    # Feed post component
│       │   ├── UserCard.tsx    # Network user card
│       │   ├── ConnectionRequestCard.tsx
│       │   ├── ChatBubble.tsx
│       │   ├── ConversationListItem.tsx
│       │   ├── FaceCapture.tsx # Webcam liveness challenge
│       │   ├── ThreeCanvas.tsx # 3D particle animation
│       │   └── TypingIndicator.tsx
│       └── routes/
│           ├── home.tsx        # Landing page with hero + features
│           ├── login.tsx       # Clean minimalist login
│           ├── signup.tsx      # 5-step wizard signup
│           ├── feed.tsx        # Social feed with composer
│           ├── chat.tsx        # Real-time dual-pane chat
│           ├── network.tsx     # Unified connections/search
│           ├── profile.tsx     # Editable own profile
│           ├── profile.$userId.tsx # Public profile view
│           ├── leaderboard.tsx
│           ├── opportunities.tsx
│           ├── events.tsx
│           ├── events.create.tsx
│           ├── events.$id.tsx
│           ├── events.scan.tsx
│           └── admin-rewards.tsx
│
└── python/                     # FastAPI ML Microservice
    ├── main.py                 # FastAPI server with liveness/verify endpoints
    ├── requirements.txt        # DeepFace, OpenCV, Qdrant, FastAPI
    ├── face_utils/
    │   ├── liveness.py         # ArcFace embedding extraction
    │   └── qdrant_store.py     # Vector DB CRUD operations
    ├── models/                 # Pre-trained model weights
    └── qdrant_data/            # Qdrant persistent storage
```

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Frontend Routes** | 15 |
| **Frontend Components** | 10 |
| **Backend API Route Files** | 10 |
| **Mongoose Models** | 10 |
| **Backend Utilities** | 8 |
| **Python ML Endpoints** | 2 |
| **CSS Design Tokens** | 15+ |
| **Total Frontend Files** | 25+ |
| **Total Backend Files** | 30+ |
| **Authentication Methods** | 4 (Email, Google, GitHub, Face Biometric) |
