# Google Cloud Run Deployment Guide

This guide details how to deploy the **CA Financial Statement Automation Agent** to **Google Cloud Run** using Docker.

---

## 🛠️ Prerequisites

1. **Google Cloud CLI (`gcloud`)** installed:
   ```bash
   gcloud auth login
   ```
2. **Set your Active Google Cloud Project**:
   ```bash
   gcloud config set project YOUR_GCP_PROJECT_ID
   ```
3. **Enable GCP APIs**:
   ```bash
   gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
   ```

---

## 🔑 Gemini API Key

The application uses the Gemini API for AI-powered ledger mapping.

**API Key:** `AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw`

---

## 🚀 Deployment Options

### Option 1: Quick Deployment via CLI ⭐ Recommended

```bash
gcloud run deploy auditfinancials \
  --source . \
  --region asia-east1 \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars GEMINI_API_KEY="AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw"
```

---

### Option 2: Deploying via Google Cloud Console (GitHub Repository Connection)

1. Open [Google Cloud Run Console](https://console.cloud.google.com/run).
2. Click **Edit & Deploy New Revision** on your `auditfinancials` service.
3. Under **Variables & Secrets** tab → **Environment Variables**, add:
   - Name: `GEMINI_API_KEY`
   - Value: `AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw`
4. Under **Capacity** set **Memory** to `1 GiB`.
5. Click **Deploy**.

---

### Option 3: Trigger Cloud Build Pipeline

```bash
gcloud builds submit --config=cloudbuild.yaml
```

This will automatically build, push, and deploy with the Gemini API key configured.

---

## 🔧 Troubleshooting Cloud Run Port / Container Failure

### Issue: "The user-provided container failed to start and listen on port 8080"

**Root Causes & Solutions Fixed:**
1. **Dynamic Vite Import**: `server.ts` uses dynamic `import('vite')` in dev mode only, preventing production crash.
2. **Build Type**: In GCP Console, ensure **Dockerfile** is selected (not Buildpacks).
3. **Memory**: Set container memory to at least **512 MB** or **1 GiB**.
4. **Environment Variables**: Add `GEMINI_API_KEY` under *Variables & Secrets* in Cloud Run.

---

## 🐳 Local Docker Testing

```bash
# Build local Docker image
docker build -t auditfinancials:local .

# Run container with Gemini API key
docker run -p 8080:8080 \
  -e GEMINI_API_KEY="AQ.Ab8RN6IAPwIQy4k5WPBABJ4D2wIbwAA-U8r0jB74Y__mI5JOGw" \
  auditfinancials:local
```

Access app at: `http://localhost:8080`
