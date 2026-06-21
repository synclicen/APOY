<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/fd78c9b7-5576-40d5-9eda-123b20b1d7f3

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Select Destination Folder (Export)

The Export view now supports choosing a specific local folder where your
processed photos will be saved — instead of relying on the browser's default
download folder.

- On the **Export** page, under **Export Destination → Local**, click
  **Select Destination Folder**.
- Pick any folder on your device via the native folder picker (File System
  Access API, supported in Chrome/Edge and other Chromium browsers).
- Each exported photo is written directly into the chosen folder as a separate
  file — no ZIP archive, no extra clicks.
- Use **Change** to pick a different folder, or the ✕ button to clear the
  selection and fall back to the standard download/ZIP flow.

> Browser doesn't support the File System Access API (e.g. Firefox/Safari)?
> The UI automatically falls back to the original download/ZIP export, so
> nothing breaks.
