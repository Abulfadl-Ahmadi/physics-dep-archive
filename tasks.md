# Project Task List

Follow the tasks below in order of priority to systematically advance the project:

---

## 🗂 1. Storage Infrastructure & Python Script Preparation
- [x] Create an account and activate Object Storage on ArvanCloud.
- [x] Create a new Bucket with Public-Read access.
- [ ] Configure CORS settings in the ArvanCloud panel:
  - `Allowed Origins`: `https://<YOUR_GITHUB_USERNAME>.github.io`
  - `Allowed Methods`: `GET`, `HEAD`
- [x] Create the `sync.py` file and install `boto3` and `python-dotenv` packages.
- [x] Test the connection to ArvanCloud and securely store keys in a `.env` file (Never commit this file!).
- [x] Implement automated GitHub Push methods at the end of the Python script using system subprocesses.

## 💻 2. Static Frontend Development (React + Tailwind + shadcn)
- [x] Initialize the project using Vite (Static Export).
- [x] Configure TailwindCSS.
- [x] Set up essential UI components (Card, FilterBar, ExamCard).
- [x] Import the `exams.json` file as the primary data source for the components.

## 🔍 3. Multi-Parameter Filtering System Development
- [x] Define separate states for each search parameter (Course, Professor, Year, Semester).
- [x] Write a combined filtering function that applies filters to individual JSON array data.
- [x] Implement a "Clear Filters" feature to enhance user experience.
- [x] Use `match-sorter` for blazing-fast client-side filtering.

## 🚀 4. GitHub CI/CD Setup
- [x] Create the GitHub Actions configuration file at `.github/workflows/deploy.yml`.
- [ ] Verify the successful execution of the pipeline after changes are pushed by the local script.
- [ ] Test and validate that PDF files download correctly from the deployed site.