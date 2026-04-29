# Portfolio of Arif Hasnat

Welcome to my personal portfolio repository. This project is designed as an ultra-fast, premium, SEO-optimized static site hosted entirely for free on GitHub Pages.

It features a modern glassmorphism design, dark/light mode toggle, dynamic scroll animations, and a centralized data architecture making it incredibly easy to update.

## Tech Stack
- **HTML5**: Semantic tags optimized for technical SEO and accessibility.
- **CSS3 (Vanilla)**: Custom CSS variables, responsive grids, and lightweight keyframe animations. No bloated frameworks.
- **JavaScript (Vanilla)**: Handles the dynamic injection of content from a single data source, dark mode persistence, and search filtering.

## How to Edit Content
Editing this portfolio does **not** require touching the HTML or CSS.

1. Open `assets/js/data.js`.
2. This file contains a single Javascript object: `portfolioData`.
3. Locate the section you want to update (e.g., `projects`, `experiences`, `certificates`).
4. Modify the strings, arrays, or objects directly.
5. Save the file. The website will automatically update to reflect the new data.

### Example: Adding a New Project
```javascript
// Inside assets/js/data.js -> projects array
{
    title: "New Amazing Project",
    description: "A short description of what this project does and why it's cool.",
    tags: ["Python", "Machine Learning"],
    github: "https://github.com/arifhasnat3po/new-project",
    live: "https://new-project-demo.com",
    featured: true // Set to false if it shouldn't have a star
}
```

### Example: Updating PDFs
If you want to add or change a PDF (like your CV or a certificate):
1. Upload the PDF file to the `assets/pdf/` folder.
2. In `data.js`, update the `pdfFile` property to exactly match the filename. For example: `assets/pdf/My_New_CV.pdf`.

## How to Run Locally
Since this is a static site, you don't need NodeJS or build steps.
1. Clone this repository.
2. Open `index.html` in any web browser.
3. *Note: If you want to use the Live Server extension in VS Code, that works perfectly too.*

## How to Deploy to GitHub Pages
This project is pre-configured to work flawlessly on GitHub Pages.

1. Commit and push all changes to your `main` branch.
2. Go to your repository **Settings** on GitHub.
3. Click on **Pages** in the left sidebar.
4. Under "Build and deployment", set the **Source** to `Deploy from a branch`.
5. Under "Branch", select `main` and `/ (root)`, then click **Save**.
6. Wait a few minutes. Your site will be live at `https://arifhasnat3po.github.io/portfolio.io/`.

## Credits & Performance
This site was built with a strict focus on a 100/100 Lighthouse score for Performance, SEO, and Accessibility.

*Created for Arif Hasnat.*
