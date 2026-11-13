import fs from 'node:fs/promises';
import path from 'node:path';

// Optional maintainer tooling. Normal serve/export modules do not import this file.
export async function findCreator(){
  const candidates=process.env.COCOS_CREATOR?[process.env.COCOS_CREATOR]:process.platform==='win32'?['C:/ProgramData/cocos/editors/Creator/3.8.8/CocosCreator.exe']:process.platform==='darwin'?['/Applications/Cocos/Creator/3.8.8/CocosCreator.app/Contents/MacOS/CocosCreator']:[];
  for(const executable of candidates){try{await fs.access(executable);return executable;}catch{}}
  throw new Error('仅修改底层播放器的维护者需要 Cocos Creator 3.8.8。普通使用请直接启动随包编辑器；不需要 engine:build。维护者可用 COCOS_CREATOR 指定构建工具路径。');
}
export function creatorResourcePath(executable,relative){return path.resolve(path.dirname(executable),process.platform==='darwin'?'../Resources':'resources',relative);}
