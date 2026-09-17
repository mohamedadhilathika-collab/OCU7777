# OCU Production Deployment Guide — Netlify

This guide outlines the production deployment strategy for the **Omni Comic Universe (OCU)** bookstore platform on **Netlify**.

## 🚀 Deployment Overview
OCU is optimized as a high-performance, single-page application (SPA) powered by **React**, **Vite**, and **Tailwind CSS**. Its server-side payment screenshot verification utilizes **Gemini 3.5 Flash** via a serverless function, making the entire platform 100% compatible with Netlify's serverless and CDN infrastructure.

---

## 🛠️ Created Deployment Configuration Files

The following essential files have been added/configured to ensure seamless production-readiness:

1. **`netlify.toml`**: Configures the automated build command, the `dist` publish folder, serverless functions directory (`netlify/functions`), and rewrites all route traffic to `index.html` for smooth SPA navigation.
2. **`_redirects`**: Sits in the public folder and is copied into the build output to serve as a high-reliability fallback router, mapping `/api/verify-payment` to our Netlify Serverless Function and resolving any client-side SPA route refreshes without 404 errors.
3. **`netlify/functions/verify-payment.ts`**: A fully serverless, highly-scalable, TypeScript-based Netlify function that handles real-time OCR payment screenshot validation using the official `@google/genai` SDK and secure API key management.
4. **`public/robots.txt`**: Optimizes production SEO search indexing.
5. **`public/sitemap.xml`**: Lists primary navigation paths for indexability.
6. **`index.html`**: Completely optimized with production-ready metadata, custom Open Graph (OG) cards, cinematic title, description, and high-performance font inclusions.

---

## 🔑 Environment Variables Configuration

To run real-time payment screenshot verification, configure the following environment variable inside the **Netlify Team Dashboard**:

1. Go to **Site Configuration** > **Environment variables** > **Add a variable**.
2. Define:
   * **Key**: `GEMINI_API_KEY`
   * **Value**: *[Your Google AI Studio or Gemini Developer API Key]*
3. (Optional) Define:
   * **Key**: `APP_URL`
   * **Value**: `https://your-custom-site.netlify.app`

*Note: If `GEMINI_API_KEY` is not provided, OCU will automatically run in a safe, secure "Offline Simulation Mode" to support continuous testing and user evaluations.*

---

## 📦 Local Building & Manual Deployment

You can test the production build locally or use the Netlify CLI to deploy:

### 1. Generate Production Build
Run the standard build command:
```bash
npm run build
```
This produces optimized, minified static assets in the `/dist` folder.

### 2. Test Netlify Functions Locally
To run and test Netlify functions locally alongside the dev server:
```bash
npm install -g netlify-cli
ntl dev
```

### 3. Deploy via Netlify CLI
To manually deploy the build output to Netlify:
```bash
# Login to Netlify
netlify login

# Deploy draft version
netlify deploy --dir=dist

# Deploy production version
netlify deploy --dir=dist --prod
```

---

## 🔍 Verified Workflows & Navigation

All key pages and states have been thoroughly verified and optimized:
* **Home Page**: Features smooth entering motion animations and a Bento-Grid central universe control center.
* **Comics Catalog**: Optimized cover placeholders with CSS gradients to eliminate resource footprint and layout shifting.
* **Immersive Dossiers**: Interactive panels featuring character stats, lore timelines, and background schemas.
* **My Library**: Client-side acquired comics view that displays and opens purchase histories and active reading copies.
* **PDF Comic Reader**: Powered by reliable CDN integrations with responsive page controls, ideal for mobile, desktop, and tablet devices.
* **Administrator Portal**: Access via secure client login modal to manage comics, generate custom Gift Codes, and audit real-time user checkout histories.
