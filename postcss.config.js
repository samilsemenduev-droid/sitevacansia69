import autoprefixer from 'autoprefixer';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from 'tailwindcss';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tailwindConfigPath = path.join(__dirname, 'tailwind.config.js');

// #region agent log
{
  const logPath = path.join(__dirname, 'debug-2edef9.log');
  const payload = {
    sessionId: '2edef9',
    timestamp: Date.now(),
    location: 'postcss.config.js',
    message: 'postcss config module loaded',
    data: { tailwindConfigPath, cwd: process.cwd() },
    hypothesisId: 'H1',
  };
  try {
    fs.appendFileSync(logPath, `${JSON.stringify(payload)}\n`);
  } catch {
    /* ignore */
  }
  fetch('http://127.0.0.1:7577/ingest/679b4ef6-469f-4cf6-86bd-cafeef1dbd71', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': '2edef9' },
    body: JSON.stringify({ ...payload, runId: 'pre-fix' }),
  }).catch(() => {});
}
// #endregion

/** Явный config — на Windows без этого PostCSS/Vite иногда не видит extend.colors, и @apply border-line падает. */
export default {
  plugins: [tailwindcss({ config: tailwindConfigPath }), autoprefixer()],
};
