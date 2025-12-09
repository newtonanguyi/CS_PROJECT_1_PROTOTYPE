# How to Upload This Project to GitHub

This guide will walk you through the process of uploading your Smart AI Advisory System project to GitHub.

## Prerequisites

- A GitHub account ([sign up here](https://github.com/signup) if you don't have one)
- Git installed on your computer ([download here](https://git-scm.com/downloads))
- Your project files ready

## Step 1: Create a .gitignore File

Before initializing Git, create a `.gitignore` file in the root directory to exclude unnecessary files from version control.

**Create a file named `.gitignore` in the root directory with the following content:**

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
venv/
env/
ENV/
.venv
*.egg-info/
dist/
build/

# Django
*.log
db.sqlite3
db.sqlite3-journal
/media
/staticfiles

# Environment variables
.env
.env.local
.env.*.local

# Node.js
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.pnp
.pnp.js

# React build
/frontend/build
/frontend/.pnp

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Large datasets (exclude from git - use Git LFS if needed)
/dataset/
*.JPG
*.jpg
*.png
*.jpeg

# Model files (consider using Git LFS for large files)
*.pth
*.onnx.data
checkpoint.pth

# Keep the actual model files but exclude data files
# Uncomment the line below if you want to exclude all model files:
# /models/

# OS
Thumbs.db
.DS_Store

# Temporary files
*.tmp
*.temp
```

**Note:** The dataset folder contains 20,000+ images which are too large for regular Git. Consider using Git LFS (Large File Storage) if you need to version control these files, or exclude them entirely.

## Step 2: Initialize Git Repository

1. **Open PowerShell or Command Prompt** in your project directory:
   ```powershell
   cd "c:\Users\ANGUYI NEWTON\Desktop\Smart Ai Advisory System"
   ```

2. **Initialize Git repository:**
   ```powershell
   git init
   ```

3. **Check Git status:**
   ```powershell
   git status
   ```

## Step 3: Stage Your Files

1. **Add all files to staging area:**
   ```powershell
   git add .
   ```

2. **Verify what will be committed:**
   ```powershell
   git status
   ```

   You should see all your project files listed (except those in `.gitignore`).

## Step 4: Create Your First Commit

1. **Commit your files:**
   ```powershell
   git commit -m "Initial commit: Smart AI Advisory System"
   ```

   If this is your first time using Git, you may need to configure your identity:
   ```powershell
   git config --global user.name "Your Name"
   git config --global user.email "your.email@example.com"
   ```

## Step 5: Create a GitHub Repository

1. **Go to GitHub** and sign in to your account

2. **Click the "+" icon** in the top right corner and select **"New repository"**

3. **Fill in the repository details:**
   - **Repository name:** `smart-ai-advisory-system` (or your preferred name)
   - **Description:** "AI-powered agricultural advisory system for smallholder farmers"
   - **Visibility:** Choose Public or Private
   - **DO NOT** initialize with README, .gitignore, or license (you already have these)

4. **Click "Create repository"**

## Step 6: Connect Local Repository to GitHub

After creating the repository, GitHub will show you commands. Use these commands in your terminal:

1. **Add the remote repository:**
   ```powershell
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPOSITORY_NAME.git
   ```
   
   Replace `YOUR_USERNAME` with your GitHub username and `YOUR_REPOSITORY_NAME` with the repository name you created.

   **Example:**
   ```powershell
   git remote add origin https://github.com/johndoe/smart-ai-advisory-system.git
   ```

2. **Verify the remote was added:**
   ```powershell
   git remote -v
   ```

## Step 7: Push Your Code to GitHub

1. **Push your code to GitHub:**
   ```powershell
   git branch -M main
   git push -u origin main
   ```

   You'll be prompted for your GitHub credentials:
   - **Username:** Your GitHub username
   - **Password:** Use a Personal Access Token (not your GitHub password)
   
   **To create a Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Click "Generate new token (classic)"
   - Give it a name and select scopes: `repo` (full control of private repositories)
   - Click "Generate token" and copy it
   - Use this token as your password when pushing

2. **After successful push, refresh your GitHub repository page** - you should see all your files!

## Step 8: Verify Your Upload

1. Go to your GitHub repository page
2. Check that all important files are present:
   - README.md
   - requirements.txt
   - Frontend and backend code
   - Configuration files

## Optional: Add Additional Information

### Add a License File

If you want to add a license (the README mentions MIT License):

1. Create a file named `LICENSE` in the root directory
2. Add the MIT License text (you can find templates online)
3. Commit and push:
   ```powershell
   git add LICENSE
   git commit -m "Add MIT License"
   git push
   ```

### Update README with Badges

You can add badges to your README.md for a more professional look:
- Build status
- License
- Version

## Troubleshooting

### Issue: "Repository not found" error
- **Solution:** Check that your repository name and username are correct in the remote URL

### Issue: "Authentication failed"
- **Solution:** Use a Personal Access Token instead of your password

### Issue: Files are too large
- **Solution:** 
  - Use Git LFS for large files: `git lfs install` then `git lfs track "*.onnx"`
  - Or exclude large files in `.gitignore` (already done for dataset folder)

### Issue: "Branch 'main' does not exist"
- **Solution:** The branch might be named 'master'. Check with `git branch` and use the correct branch name

### Issue: Want to exclude more files
- **Solution:** Add patterns to your `.gitignore` file, then:
  ```powershell
  git rm -r --cached .
  git add .
  git commit -m "Update .gitignore"
  git push
  ```

## Best Practices

1. **Regular Commits:** Make frequent, meaningful commits
   ```powershell
   git add .
   git commit -m "Descriptive message about changes"
   git push
   ```

2. **Branching:** Create branches for new features
   ```powershell
   git checkout -b feature-name
   # Make changes
   git add .
   git commit -m "Add new feature"
   git push -u origin feature-name
   ```

3. **Pull Before Push:** Always pull latest changes before pushing
   ```powershell
   git pull origin main
   git push origin main
   ```

4. **Meaningful Commit Messages:** Write clear, descriptive commit messages

5. **Don't Commit Sensitive Data:** Never commit API keys, passwords, or `.env` files (already in `.gitignore`)

## Next Steps

- Set up GitHub Actions for CI/CD
- Add issue templates
- Set up branch protection rules
- Add collaborators if working in a team
- Consider using GitHub Pages for documentation

## Need Help?

- [Git Documentation](https://git-scm.com/doc)
- [GitHub Help](https://help.github.com/)
- [GitHub Guides](https://guides.github.com/)

---

**Congratulations!** Your project is now on GitHub! 🎉
