# Google Cloud Run Deployment Guide

This guide details how to deploy the **NCE Audit Financials (CA Financial Statement Automation Agent)** to **Google Cloud Run** using Docker.

---

## 🌟 Quickest Method: Deploy via Google Cloud Run Console (Connected to GitHub)

Since your code is pushed to **[https://github.com/vishalsutar7-bot/nceauditfinancials](https://github.com/vishalsutar7-bot/nceauditfinancials)**, you can deploy it directly from GitHub with automatic continuous deployment:

1. Open the [Google Cloud Run Console](https://console.cloud.google.com/run).
2. Click **Create Service**.
3. Select **"Continuously deploy from a repository"** and click **Set Up with Cloud Build**.
4. Choose **GitHub** as your repository provider:
   - Select repository: `vishalsutar7-bot/nceauditfinancials`
   - Branch: `^main$`
   - Build Type: **Dockerfile** (Source location: `/Dockerfile`)
5. **Service Settings**:
   - Service name: `auditfinancials` (or your preferred name)
   - Region: Select your closest region (e.g., `asia-south1` for Mumbai, `asia-east1`, or `us-central1`).
   - Authentication: Select **"Allow unauthenticated invocations"** (to make the web app accessible via public URL).
   - Container port: **`8080`** (pre-configured in Dockerfile).
6. **Variables & Secrets (Optional)**:
   - Click **Container, Volumes, Networking, Security** -> **Variables & Secrets**.
   - Add Environment Variable:
     - Name: `GEMINI_API_KEY`
     - Value: `AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw` (or your preferred Gemini API key).
     *(Note: If omitted, the app automatically falls back to the built-in ICAI statutory rule classification engine).*
7. Click **Create**!
   Cloud Run will build the Docker container and provide a live secure **`https://auditfinancials-...run.app`** URL.

---

## ⚡ Method 2: Deploy Using Google Cloud Shell (No Local Installs Needed)

You can deploy directly using Google Cloud Shell in your browser:

1. Open [Google Cloud Shell](https://shell.cloud.google.com).
2. Clone your repository:
   ```bash
   git clone https://github.com/vishalsutar7-bot/nceauditfinancials.git
   cd nceauditfinancials
   ```
3. Deploy directly using `gcloud`:
   ```bash
   gcloud run deploy auditfinancials \
     --source . \
     --region asia-south1 \
     --allow-unauthenticated \
     --port 8080 \
     --set-env-vars GEMINI_API_KEY="AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw"
   ```
4. Follow the prompt to enable Artifact Registry / Cloud Build if requested.
5. In ~2 minutes, Google Cloud Run will return your live production URL.

---

## 🛠️ Method 3: Cloud Build Pipeline (`cloudbuild.yaml`)

If you prefer building and deploying via a Cloud Build pipeline:

```bash
gcloud builds submit --config=cloudbuild.yaml
```

---

## 🐳 Local Docker Testing

If you have Docker installed on your computer:

```bash
# Build Docker image
docker build -t auditfinancials:latest .

# Run container locally
docker run -d -p 8080:8080 \
  -e GEMINI_API_KEY="AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw" \
  auditfinancials:latest
```

Open [http://localhost:8080](http://localhost:8080) to test the container.
