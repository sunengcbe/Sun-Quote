# Quotation Generator

Client-side web app that creates professional A4 quotation PDFs. No backend, no build step.

## Deploy on GitHub Pages
1. Create a repo and upload `index.html`, `style.css`, `app.js`.
2. Repo **Settings > Pages > Build and deployment**: Source = *Deploy from a branch*, Branch = `main` / `(root)`.
3. Open `https://<your-username>.github.io/<repo-name>/`.

## Notes
- Company details and logo are entered in the app and saved in the browser (localStorage); nothing is hard-coded.
- The PDF loads IBM Plex Sans from jsDelivr when you click Generate, so the rupee sign prints correctly. If offline, it falls back to Helvetica and "Rs.".
- Libraries (jsPDF, jspdf-autotable) load from cdnjs. To work fully offline, download them into the repo and change the `<script>` tags.
- GST is never added or calculated. It appears only if typed into Notes.
