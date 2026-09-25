# GitHub Automated Deployment Guide (CI/CD)

This guide shows you how to connect your project to GitHub and automatically deploy to **Google Cloud Run** and/or **Firebase Hosting** whenever you push code to GitHub.

---

## 📌 Step 1: Push Your Code to a GitHub Repository

If you haven't created a GitHub repository yet:

1. Go to [github.com/new](https://github.com/new) and create a repository (e.g. `auditfinancials`).
2. In your local project directory, run:

```bash
# 1. Initialize git
git init

# 2. Stage all files
git add .

# 3. Commit
git commit -m "Initial commit for NCE Audit Financials"

# 4. Set default branch to main
git branch -M main

# 5. Link your GitHub remote repository (replace with your GitHub username/repo)
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/auditfinancials.git

# 6. Push your code
git push -u origin main
```

---

## 🚀 Step 2: Set Up GitHub Secrets for Cloud Run Deployment

The Cloud Run workflow (`.github/workflows/deploy-cloud-run.yml`) automatically builds your `Dockerfile` and deploys to Cloud Run upon push.

### Generating a Google Cloud Service Account Key:
1. In the Google Cloud Console or terminal, run:
```bash
# Create service account
gcloud iam service-accounts create github-deployer \
  --description="Service account for GitHub Actions deployment" \
  --display-name="GitHub Deployer" \
  --project=gen-lang-client-0873724595

# Grant required roles to the service account
gcloud projects add-iam-policy-binding gen-lang-client-0873724595 \
  --member="serviceAccount:github-deployer@gen-lang-client-0873724595.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding gen-lang-client-0873724595 \
  --member="serviceAccount:github-deployer@gen-lang-client-0873724595.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding gen-lang-client-0873724595 \
  --member="serviceAccount:github-deployer@gen-lang-client-0873724595.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding gen-lang-client-0873724595 \
  --member="serviceAccount:github-deployer@gen-lang-client-0873724595.iam.gserviceaccount.com" \
  --role="roles/cloudbuild.builds.editor"

# Generate JSON Key
gcloud iam service-accounts keys create gcp-key.json \
  --iam-account=github-deployer@gen-lang-client-0873724595.iam.gserviceaccount.com \
  --project=gen-lang-client-0873724595
```

2. Add the Secret to GitHub:
   - On GitHub, go to your repository: **Settings** > **Secrets and variables** > **Actions**.
   - Click **New repository secret**.
   - **Name**: `GCP_SA_KEY`
   - **Value**: Copy and paste the entire contents of `gcp-key.json`.
   - Click **Add secret**.

---

## 🔥 Step 3: (Optional) Set Up GitHub Secrets for Firebase Hosting

If you also wish to deploy the frontend to Firebase Hosting automatically:

1. Run:
```bash
firebase init hosting:github
```
This CLI tool will authenticate with GitHub and create the `FIREBASE_SERVICE_ACCOUNT_GEN_LANG_CLIENT_0873724595` secret in your repository automatically.

---

## ✅ Step 4: Verify Deployment

1. Make any change and push to `main`:
```bash
git add .
git commit -m "Update application"
git push origin main
```
2. Navigate to the **Actions** tab on your GitHub repository.
3. You will see the **Deploy to Google Cloud Run** workflow running. Once finished (green checkmark), your app is live!
