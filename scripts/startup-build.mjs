import fs from 'node:fs/promises';
import path from 'node:path';

// Creator can replace project splash settings with its template defaults.
// Disable that engine-owned screen; AvgPlayer renders the project-owned UI.
export async function disableEngineSplash(directory){
 const file=path.join(directory,'src/settings.json');
 const settings=JSON.parse(await fs.readFile(file,'utf8'));
 settings.splashScreen={totalTime:0};
 await fs.writeFile(file,JSON.stringify(settings));
}
