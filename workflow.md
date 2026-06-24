# Project Workflow Specification

This document outlines the interaction between the local upload tool, cloud storage, static frontend, and the GitHub pipeline.

---

## 🔄 System Workflow Architecture

[User] ──(Upload File & Extract Metadata)──> [Local Python Script]
                                                │
                       ┌────────────────────────┴────────────────────────┐
                       ▼                                                 ▼
          [Upload PDF/Image File]                                [Update Data]
                       │                                                 │
                       ▼                                                 ▼
           [ArvanCloud Object Storage]                            [Local `exams.json`]
                       │                                                 │
                       │                                                 ▼
                       │                                        [Git Commit & Push]
                       │                                                 │
                       ▼                                                 ▼
          [Direct Public Link]                                   [GitHub Actions]
                       │                                                 │
                       │                                                 ▼
                       └───────────────────────────────────────> [GitHub Pages (UI)]

---

## 🛠 Step-by-Step Process Details

### Step 1: Execute Local Script
The user runs the following command in their terminal:
```bash
python sync.py --file="./math2-final.pdf"
```

### Step 2: Cloud Processing & Upload
- The script connects to the ArvanCloud S3 bucket using the `Access Key` and `Secret Key`.
- It uploads the file and generates a direct, public link:
  `https://exam-archive.s3.ir-thr-at1.arvanstorage.ir/math2-final.pdf`

### Step 3: Update Static Database
- The script opens the `src/data/exams.json` file.
- It appends a new object containing the course, professor, year, and `file_url` (ArvanCloud link) to the end of the array and saves the file.

### Step 4: Auto-Sync with GitHub
The script automatically executes Git commands:
```bash
git add src/data/exams.json
git commit -m "Feat: Add new exam paper for math2"
git push origin main
```

### Step 5: Deploy and Update Website
- GitHub detects the change in the `main` branch.
- **GitHub Actions** triggers, builds the project, and deploys the new static build to **GitHub Pages**.
- Users gain immediate access to the new file and optimized filters without needing to reload the entire database manually.