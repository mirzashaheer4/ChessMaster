# 🌐 Domain Setup: chessmaster.live

Specific instructions for connecting **chessmaster.live** (Namecheap) to your project (Vercel).

## 1. Vercel Domain Settings
1. Go to Your Project > **Settings** > **Domains**.
2. Add `chessmaster.live`.
3. Add `www.chessmaster.live` (Vercel will ask to redirect it to the root).

## 2. Namecheap DNS Configuration
Login to Namecheap, go to **Advanced DNS**, and add these records:

| Type | Host | Value |
| :--- | :--- | :--- |
| **A Record** | `@` | `76.76.21.21` |
| **CNAME Record** | `www` | `cname.vercel-dns.com` |

> [!IMPORTANT]
> Remove any existing "URL Redirect" or "Parking" records from Namecheap that might conflict.

## 3. Environment Variables (Vercel Dashboard)
Update these in Vercel **Settings > Environment Variables**:

| Key | Value | Purpose |
| :--- | :--- | :--- |
| `FRONTEND_URL` | `https://chessmaster.live` | Allows the server to accept requests from your domain (CORS). |
| `VITE_SERVER_URL` | `https://api.chessmaster.live` | **(Check this!)** Point this to your backend URL. |

## 4. Mobile App Configuration
I have updated `capacitor.config.ts` to use your new domain for secure communication.
