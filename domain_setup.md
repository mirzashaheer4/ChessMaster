# 🌐 Domain Setup: chessmaster.live

Instructions for connecting the **chessmaster.live** custom domain (purchased via Namecheap) to the Vercel-deployed application.

## 1. Vercel Domain Configuration
1. Navigate to your project in the [Vercel Dashboard](https://vercel.com/dashboard).
2. Go to **Settings** > **Domains**.
3. Add `chessmaster.live`.
4. Add `www.chessmaster.live` (Vercel will recommend a redirect to the apex domain; accept this for better SEO).

## 2. Namecheap DNS Records
Login to your Namecheap account, navigate to **Advanced DNS**, and ensure the following records are present. Remove any conflicting "Parking" or "URL Redirect" records.

| Type | Host | Value | TTL |
| :--- | :--- | :--- | :--- |
| **A Record** | `@` | `76.76.21.21` | Automatic |
| **CNAME Record** | `www` | `cname.vercel-dns.com` | Automatic |

> [!IMPORTANT]
> DNS propagation can take anywhere from a few minutes to 24 hours. You can track progress using [DNSChecker.org](https://dnschecker.org).

## 3. Deployment Environment Variables
Ensure these variables are configured in the **Vercel Settings > Environment Variables** tab to enable secure cross-origin communication between the frontend and backend.

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `FRONTEND_URL` | `https://chessmaster.live` | Enables CORS on the backend for your production domain. |
| `VITE_SERVER_URL` | `https://your-api-url.com` | Points the frontend to your deployed server instance. |

## 4. Mobile & Capacitor Considerations
The `capacitor.config.ts` has been configured to respect the production domain. When building for Android/iOS, ensure that the `server.url` or `appId` does not conflict with your live SSL certificates.

---
*Last Updated: April 2026*
