import fs from 'node:fs/promises';
import path from 'node:path';
import {root} from './seed.mjs';

// Optional legacy flat asset directory; all inputs ship with the example.
const assets={
 'hall.png':'backgrounds/hall.png',
 'lin.png':'characters/lin/normal.png',
 'chen.png':'characters/chen/normal.png',
 'radio.png':'backgrounds/radio.png',
 'roof.png':'backgrounds/roof.png',
 'bell.wav':'audio/bell.wav'
};
const source=path.join(root,'projects/last-program/story-assets');
const destination=path.join(root,'public/story-assets');
await fs.mkdir(destination,{recursive:true});
for(const [name,file]of Object.entries(assets))await fs.copyFile(path.join(source,file),path.join(destination,name));
console.log('Sample artwork and bell installed.');
