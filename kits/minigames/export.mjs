import path from 'node:path';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {exportMinigame,verifyRuntime,platforms} from './lib/export.mjs';
const args=process.argv.slice(2),option=(key,fallback)=>{const i=args.indexOf('--'+key);if(i<0)return fallback;if(!args[i+1]||args[i+1].startsWith('--'))throw Error('缺少 --'+key+' 的值');return args[i+1];};
try{
 if(Number(process.versions.node.split('.')[0])<22)throw Error('需要 Node.js 22 或更新版本');
 if(args.includes('--doctor')){const available=[];for(const platform of Object.keys(platforms)){try{await fs.access(path.join(path.dirname(fileURLToPath(import.meta.url)),'runtimes',platform));}catch{continue;}await verifyRuntime(platform);available.push(platform);}if(!available.length)throw Error('缺少小游戏播放器');console.log(JSON.stringify({ok:true,requiresCreator:false,npmInstallRequired:false,platforms:available},null,2));}
 else if(args.includes('--help')||!args.length)console.log('AVG Mini Games\n  node export.mjs --project PROJECT --platform wechatgame --appid APPID\n  node export.mjs --doctor\n  --output DIR 可指定新导出的父目录，默认作品的 exports/。省略 AppID 时微信使用游客模式；真机预览和发布需自己的小游戏 AppID。');
 else console.log(JSON.stringify(await exportMinigame({projectDirectory:path.resolve(option('project',process.cwd())),platform:option('platform','wechatgame'),appid:option('appid',''),outputDirectory:option('output')}),null,2));
}catch(error){console.error(error.message);process.exitCode=1;}
