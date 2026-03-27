# Final Project Report Build Instructions

This folder is self-contained for your final report source.

## Included Files
- `SMART_AI_PROJECT_REPORT.tex`
- `smart_ai_references.bib`

## Build Prerequisite
Install a LaTeX distribution on Windows:
- [MiKTeX](https://miktex.org/download) (recommended), or
- [TeX Live](https://www.tug.org/texlive/)

After installation, restart your terminal so `pdflatex` and `bibtex` are available.

## Compile Commands
Run these in this folder:

```powershell
pdflatex -interaction=nonstopmode SMART_AI_PROJECT_REPORT.tex
bibtex SMART_AI_PROJECT_REPORT
pdflatex -interaction=nonstopmode SMART_AI_PROJECT_REPORT.tex
pdflatex -interaction=nonstopmode SMART_AI_PROJECT_REPORT.tex
```

Output:
- `SMART_AI_PROJECT_REPORT.pdf`

