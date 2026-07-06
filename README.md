# UX Auditor

A full-stack monorepo application for comprehensive UX and Accessibility auditing. UX Auditor analyzes both live URLs and GitHub repositories, generating actionable insights and code fixes using advanced AI and heuristics.

## 🚀 Features

- **URL UX Audits**: Audits any live website URL for UX heuristics and WCAG accessibility standards.
- **GitHub Repository Scans**: Clones and analyzes React repositories to detect accessibility issues within the source code, generating AI-powered fixes.
- **Unified Dashboard**: A beautiful React frontend providing insights, metrics, and a chatbot for AI assistance.
- **Monorepo Architecture**: Runs a React frontend, URL backend API, and GitHub backend API concurrently from a single command.

## 📁 Project Structure

This repository is structured as a monorepo containing three core components:

```text
ux-auditor-react/
├── src/                  # React Frontend (Vite)
├── backend-url/          # Express API for live URL auditing (Playwright + AI)
├── backend-github/       # Express API for GitHub Repo scanning
├── .env.example          # Template for required environment variables
└── package.json          # Root configuration for concurrent execution
```

## 🛠️ Installation & Setup

Follow these instructions to download and run the project locally.

### 1. Clone the Repository
Download the project to your local machine:
```bash
git clone https://github.com/Chandhru008/Ux-Auditor.git
cd Ux-Auditor
```

### 2. Install Dependencies
This project uses a root `package.json` to manage all sub-projects. However, you need to install dependencies for the root, and potentially verify the backend folders:
```bash
npm install
npm run install:all  # (Optional: If you add an install script for all folders)
```
*(Make sure to run `npm install` inside `backend-url/server` and `backend-github` if they are not already installed).*

### 3. Setup Environment Variables (`.env`)
The project relies on various API keys (like Groq for AI and Clerk for authentication) and MongoDB connections.

1. In the root of the project, copy the example environment file:
   ```bash
   cp .env.example .env
   ```
2. Open the newly created `.env` file and fill in your specific credentials.

**Required `.env` Variables:**
* **VITE_CLERK_PUBLISHABLE_KEY & CLERK_SECRET_KEY**: For user authentication.
* **GROQ_API_KEY / VITE_GROQ_API_KEY**: For LLM generation and the chatbot.
* **GITHUB_TOKEN**: A GitHub Personal Access Token to clone and scan repositories.
* **MongoDB URIs**: Ensure MongoDB is running locally on port `27017` (default) or provide your remote cluster strings.

### 4. Run the Project
You can launch the entire stack—Frontend, URL Backend, and GitHub Backend—with a single command:

```bash
npm run dev
```

This master command uses `concurrently` to boot up:
* **Frontend**: `http://localhost:5173` (or 5174/5175 if busy)
* **URL Backend API**: `http://localhost:3002`
* **GitHub Backend API**: `http://localhost:5000`

## 📡 API Endpoints

- **URL Audit**: Vite proxies `/api/audits` to `http://localhost:3002`
- **GitHub Audit**: Vite proxies `/api/repo` to `http://localhost:5000`
