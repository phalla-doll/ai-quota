# Z AI Quota Tracker

## Overview

A Telegram Mini App that displays Z AI API usage, quota consumption, token statistics, and estimated remaining credits in real time.

The application acts as a lightweight dashboard accessible directly inside Telegram, allowing developers to quickly monitor their Z AI account without opening the Z AI website.

The app is optimized for mobile usage and provides instant visibility into API consumption trends, spending forecasts, and quota health.

---

# Goal

Provide a fast and convenient way to view:

* Remaining quota
* Current month usage
* Daily usage
* Token consumption
* Estimated monthly cost
* Usage history
* Model-specific statistics

Inside Telegram.

---

# Target Users

## Individual Developers

Monitor personal API usage.

## Teams

Track shared API key consumption.

## AI Power Users

Keep track of multiple Z AI models and projects.

---

# Core Features

## Dashboard

Display summary information.

### Metrics

```txt
Remaining Credits
Used Credits
Monthly Limit
Daily Usage
Total Requests
Total Tokens
```

### Example

```txt
Remaining:
$42.13

Used:
$7.87

Monthly Budget:
$50.00

Requests:
18,429

Tokens:
34.8M
```

---

## Usage Progress

Visual quota consumption.

```txt
████████░░░░░░░░░░

32%
Used
```

---

## Daily Usage Chart

Track usage trends.

```txt
Today
Yesterday
Last 7 Days
Last 30 Days
```

---

## Model Usage

Breakdown by model.

### Example

```txt
glm-5.1
12.4M Tokens

glm-4.5
8.1M Tokens

glm-coding
3.2M Tokens
```

---

## Request Analytics

Display:

```txt
Successful Requests
Failed Requests
Average Response Time
Peak Usage Hour
```

---

## Spending Forecast

Estimate end-of-month cost.

### Example

```txt
Current Spend:
$7.87

Projected:
$23.10

Budget:
$50.00
```

---

## Telegram Notifications

Send alerts when:

```txt
50% Used
75% Used
90% Used
95% Used
```

Example:

```txt
⚠️ Z AI Usage Alert

You have consumed 90% of your monthly quota.

Remaining:
$4.81
```

---

## Multi API Key Support

Manage multiple environments.

### Example

```txt
Personal
Production
Development
Testing
```

Switch between them instantly.

---

## Historical Reports

View usage history.

### Time Ranges

```txt
Today
7 Days
30 Days
90 Days
1 Year
```

---

## Export Reports

Formats:

```txt
CSV
JSON
Excel
```

---

# Telegram Mini App Experience

## Home Screen

```txt
┌──────────────────┐
│ Z AI Tracker     │
├──────────────────┤
│ Remaining $42.13 │
│ Used      $7.87  │
│ Progress  32%    │
├──────────────────┤
│ Usage Chart      │
├──────────────────┤
│ Models           │
├──────────────────┤
│ Forecast         │
└──────────────────┘
```

---

## Navigation

```txt
Dashboard
Usage
Models
History
Settings
```

Bottom-tab layout.

---

# Technical Stack

## Frontend

```txt
Next.js 15
React 19
TypeScript
Tailwind CSS
shadcn/ui
Telegram Mini Apps SDK
TanStack Query
Zustand
```

---

## Backend

```txt
Cloudflare Workers
```

Responsibilities:

```txt
Store API Keys
Aggregate Usage
Cache Statistics
Serve Dashboard Data
```

---

## Database

```txt
Cloudflare D1
Drizzle ORM
```

---

## Storage

```txt
Cloudflare KV
```

Used for:

```txt
Cached Usage Data
Settings
Notification Preferences
```

---

# Database Schema

## users

```sql
id
telegram_id
name
created_at
```

---

## api_keys

```sql
id
user_id
name
encrypted_key
created_at
```

---

## usage_snapshots

```sql
id
api_key_id
requests
tokens
cost
captured_at
```

---

## alerts

```sql
id
user_id
threshold
enabled
```

---

# API Layer

## Z AI Client

Base URL:

```txt
https://api.z.ai/api/paas/v4
```

Authentication:

```txt
Authorization: Bearer API_KEY
```

Worker fetches usage statistics periodically and stores snapshots.

---

# Security

## API Key Storage

Requirements:

```txt
Encrypted At Rest
Never Exposed To Frontend
Server Side Access Only
```

### Recommended

```txt
Cloudflare Secrets
AES Encryption
Worker Environment Variables
```

---

# Background Jobs

Run every:

```txt
5 Minutes
15 Minutes
1 Hour
```

Tasks:

```txt
Fetch Usage
Update Statistics
Generate Forecasts
Check Alerts
```

---

# Future Features

## Widget Mode

Pinned Telegram dashboard.

---

## AI Insights

Generate:

```txt
Usage Patterns
Cost Optimization
Model Recommendations
```

---

## Multi Provider Support

Future expansion:

```txt
Z AI
OpenAI
Anthropic
Google Gemini
NVIDIA
OpenRouter
```

Single dashboard for all AI providers.

---

# MVP Scope

Version 1 should include:

* Telegram Login
* API Key Management
* Usage Dashboard
* Quota Tracking
* Daily Usage Chart
* Model Breakdown
* Notifications
* Historical Reports

The MVP should be built as a Telegram Mini App using Next.js, Telegram Mini Apps SDK, Cloudflare Workers, D1, and Cloudflare KV. The architecture should be provider-agnostic so that support for OpenAI, Anthropic, NVIDIA, and other AI platforms can be added later without major refactoring.
