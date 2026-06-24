# Exam Archive Smart Roadmap

This project consists of two main parts: a **Static Frontend (GitHub Pages)** and a **Local Sync CLI Tool**, backed by **ArvanCloud Object Storage**.

---

## 🗺 Development Phases

### 🏗 Phase 1: Infrastructure & Local Sync Tool
- [ ] Set up a Bucket in ArvanCloud Object Storage and configure its access to Public.
- [ ] Configure **CORS** rules on the ArvanCloud bucket to accept requests from the GitHub Pages domain.
- [ ] Develop a local Python script (`sync.py`) using `boto3` for automated file uploads.
- [ ] Integrate automated Git commands (using Python `subprocess` for `git add`, `commit`, and `push`) after each successful upload.

### 🎨 Phase 2: Frontend Foundation
- [ ] Initialize the project with a static framework (e.g., Vite + React or Next.js in Static Export mode).
- [ ] Configure automated deployment to **GitHub Pages** via GitHub Actions.
- [ ] Install and configure **TailwindCSS** and the **shadcn/ui** component system.
- [ ] Design the static database structure (`exams.json`) to store metadata.

### 🔍 Phase 3: Advanced Search & User Interface
- [ ] Design a modern, minimal homepage with Dark/Light themes using Navigation and Exam Card components.
- [ ] Implement a multi-parameter filtering and search system based on:
  - Course Name
  - Professor's Name
  - Year
  - Semester (Fall/Spring/Summer)
  - Exam Type (Midterm/Final/Quiz)
- [ ] Utilize search optimization libraries like `match-sorter` for blazing-fast client-side filtering on the JSON file.

### 🤖 Phase 4: Agentic Automation
- [ ] Integrate the local script with Large Language Models (like Claude 3.5 Sonnet via OpenRouter) during the upload phase.
- [ ] Automatically extract metadata (course, professor, year) from the exam paper image or PDF upon upload, eliminating manual data entry.