import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// When the site is built without an explicit base path, Vite assumes
// the app is served from the server root (`/`). This breaks when the
// bundle is opened from a subdirectory (e.g. GitHub Pages) because the
// generated HTML references assets at `/assets/...`, resulting in 404s
// like `index-*.css` or `index-*.js` not being found.  By falling back
// to a relative path (`./`), the built HTML will reference assets
// relative to its own location and work regardless of where it's
// hosted.  The `VITE_BASE` environment variable can still override this
// when a custom absolute base is desired.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "./",
});
