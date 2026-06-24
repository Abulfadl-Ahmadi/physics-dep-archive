# Smart Agent Architecture (AGENTS.md)

To minimize manual data entry for exam papers, a smart agent is designed within the local script responsible for extracting metadata.

---

## 🤖 Metadata Extraction Agent Architecture

### 1. Agent Objective
Receive an exam paper file (PDF or image), analyze its text/visuals, and output a standard static JSON object containing accurate paper details without user intervention.

### 2. Tech Stack
- **AI Engine:** Claude 3.5 Sonnet (via OpenRouter pipeline or direct API) due to its high accuracy in understanding complex academic structures.
- **Interface:** Local Python script with file processing libraries (e.g., `pypdf` or `pdf2image`).

### 3. System Prompt Structure
The agent will be executed with the following prompt to deliver the response exactly in our required data structure:

```text
You are a smart academic archive assistant. Your task is to analyze images or PDF pages of exam papers and accurately extract the following information in a valid JSON structure.

Strict Rules:
1. Extract the year as a 4-digit number (e.g., 2023 or 1402 for Persian calendar).
2. If any information (like the professor's name) is missing from the paper, set its value to null.
3. Do not add any explanations; return only the JSON array.

Required Output Structure:
{
  "course": "Exact Course Name",
  "professor": "Professor's Name",
  "year": "Year of the Exam",
  "semester": "Fall / Spring / Summer",
  "exam_type": "Midterm / Final / Quiz"
}
```

### 4. Workflow in the Project Pipeline
1. The user places the exam paper file in a local directory.
2. The upload script first sends the file to this Agent.
3. The Agent returns the JSON output.
4. The script displays the extracted information for the user to verify or edit if necessary.
5. Upon confirmation, the file is uploaded to ArvanCloud, and the metadata is appended to `exams.json`.