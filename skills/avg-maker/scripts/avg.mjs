import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const folder=path.dirname(fileURLToPath(import.meta.url));
const packaged=path.resolve(folder,'../assets/toolkit');
const toolkit=fs.existsSync(path.join(packaged,'scripts/cli.mjs'))?packaged:path.resolve(folder,'../../..');
await import(pathToFileURL(path.join(toolkit,'scripts/cli.mjs')).href);
