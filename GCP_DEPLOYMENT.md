# Google Cloud Run Deployment Guide

This guide details how to deploy the **NCE Audit Financials** application to **Google Cloud Run** using the included `Dockerfile` and your Google Cloud project (`gen-lang-client-0873724595`).

---

## 🚀 Option 1: 1-Step Direct Deploy using Google Cloud CLI (`gcloud`)

Run the following command from the root directory of your project:

```bash
gcloud run deploy auditfinancials \
  --source . \
  --project gen-lang-client-0873724595 \
  --region us-west1 \
  --allow-unauthenticated \
  --port 8080
```

When prompted:
1. Accept the creation of an Artifact Registry repository (if it is the first deployment).
2. Cloud Run will automatically build the container via the `Dockerfile`, push the image, and output your live production URL:
   `https://auditfinancials-xxxxxx-uw.a.run.app`

---

## 🛠️ Option 2: Deploy with Cloud Build Pipeline (`cloudbuild.yaml`)

You can also submit the build directly to Google Cloud Build:

```bash
gcloud builds submit \
  --project gen-lang-client-0873724595 \
  --config=cloudbuild.yaml
```

---

## 🌐 Option 3: Deploy via Google Cloud Run Web Console

1. Navigate to [Google Cloud Run Console](https://console.cloud.google.com/run?project=gen-lang-client-0873724595).
2. Click **Create Service**.
3. Select **"Continuously deploy from a repository"** or **"Deploy one revision from an existing container image"**.
4. Set:
   - **Service name**: `auditfinancials`
   - **Region**: `us-west1` (or your preferred region)
   - **Authentication**: **Allow unauthenticated invocations**
   - **Container Port**: `8080` (defined in `Dockerfile`)
5. Click **Deploy**.

---

## 🐳 Option 4: Local Docker Test

If you have Docker installed locally on your workstation:

```bash
# 1. Build the production container image
docker build -t auditfinancials:latest .

# 2. Run the container locally on port 8080
docker run -d -p 8080:8080 --name auditfinancials-app auditfinancials:latest

# 3. Check health status
curl http://localhost:8080/api/health
```

Then visit [http://localhost:8080](http://localhost:8080) in your web browser.
