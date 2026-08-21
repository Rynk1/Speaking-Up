# 13 - Social Sharing & Amplification Audit

## 1. Amplification & Sharing Mechanics
- **Zero-Follower Discovery:** Citizen reports immediately enter public feeds and regional channels regardless of social followers.
- **Reposting & Confirmation:** "I'm seeing this too" confirmations (`confirmations` table) and reposts (`reposts_count`) amplify post ranking.
- **Web Share Intents:** Modal `SharePreviewModal.tsx` generates deep links and copy tailored for WhatsApp (`https://wa.me/?text=`), Twitter/X (`https://twitter.com/intent/tweet?text=`), LinkedIn, and Facebook. Native Web Share API (`navigator.share`) is invoked on supported mobile browsers.

## 2. Dynamic OpenGraph Social Previews
- **Status:** `Level 2 (Connected Prototype)`
- **Finding:** Link previews rely on static HTML `<meta>` tags in `index.html`. Server-side rendering (SSR) of dynamic OpenGraph meta tags (`og:title`, `og:image`, `og:description`) for individual post URL deep links (`/posts/:id`) is missing.
- **Remediation:** Add Express middleware for `/posts/:id` crawler user-agents (WhatsApp, Twitterbot, FacebookExternalHit) to inject dynamic OpenGraph tags into `index.html`.
