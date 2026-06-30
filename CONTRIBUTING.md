# Contributing to Expense-Tracker 🚀

First off thank you for considering contributing to Expense-Tracker! It's people like you who make the open-source community such an amazing place to learn, inspire, and create.

## 📜 Code of Conduct
By participating i this project, you are expected to uphold this Code of Conduct. Please be respectful, professional, and kind to all contributors.

## 🛠 How Can  Contribute?

### 1. Reporting Bugs 🐛
If you find a bug, pleas open an **Issue** in the repository. To help us fix it quickly, please include:
- A clear, descriptive title.
- Steps to reproduce the bug.
- What you expected to happen vs. what actually happened.
- Your environment details (Python version, OS, etc.).

### 2. Suggesting Enhancements ✨
Have a cool idea for a new feature? Open an **Issue** with the tag `enhancement` to discuss it before implementing it. This ensures we're all on the same page!

### 3. Pull Requests (PRs) 📥
We love Pull Requests! To ensure a smoot merging process, please follow these steps:

#### **Step 1: Setup your environment**
Always work within a virtual environment to avoid dependency conflicts.
```powershell
# Create a virtual environment
python -m venv .venv

# Activate it (Windows)
.\.venv\Scripts\Activate.ps1
```
#### **Step 2: Install dependencies**
Ensure you have everything needed to run the project:
```powershell
pip install -r requirements.txt
```
#### **Step 3: Branching Strategy**
Don’t work directly on the main branch. Create a new branch for your feature or fix:
```powershell
git checkout -b feature/your-awesome-feature
# OR
git checkout -b fix/bug-description
```
#### **Step 4: Coding Standards**
* **Pythonic Way:** Follow **PEP 8** guidelines.
* **Modular Code**: Keep your logic separated (e.g., database logic in database.py, web logic in web.py).
* **No Hardcoded Secrets**: Never commit API keys, passwords, or sensitive data. (Crucial for security!)
#### **Step 5: Commit and Push**
**Write meaningful commit messages**. **Instead of** fixed stuff, **use** fix: resolve database connection timeout.
```powershell
git add .
git commit -m "feat: add new expense category feature"
git push origin feature/your-awesome-feature
```
#### **📝 License**
By contributing, you agree that your contributions will be licensed under the project’s existing license.
---
Happy Coding! Let’s build something great together! 💻🔥
