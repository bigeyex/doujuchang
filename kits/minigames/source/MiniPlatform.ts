declare const wx:any;
declare const tt:any;
const host:any=typeof wx!=='undefined'?wx:typeof tt!=='undefined'?tt:undefined;
const voices=new Set<any>();let music:any=null;
const media=(asset:string)=>'subpackages/story/'+asset;
function loadStory(){return new Promise<void>((resolve,reject)=>host.loadSubpackage({name:'story',success:()=>resolve(),fail:(error:any)=>reject(new Error('故事分包载入失败：'+(error.errMsg??String(error))))}));}
export const mini={
 async project(){if(!host)throw new Error('请通过小游戏开发者工具或真机运行');await loadStory();return JSON.parse(host.getFileSystemManager().readFileSync('subpackages/story/project.json','utf8'));},
 image(asset:string){return new Promise<any>((resolve,reject)=>{const image=host.createImage();image.onload=()=>resolve(image);image.onerror=(error:any)=>reject(new Error('图片载入失败：'+asset+' '+String(error?.errMsg??'')));image.src=media(asset);});},
 save(key:string,value:string){host.setStorageSync(key,value);},
 load(key:string){const value=host.getStorageSync(key);return typeof value==='string'&&value?value:null;},
 notice(message:string){host.showToast?.({title:message,icon:'none'});},
 play(asset:string,volume:number,loop=false){
  if(loop)this.stopMusic();
  return new Promise<void>((resolve,reject)=>{const audio=host.createInnerAudioContext();let settled=false;const done=()=>{if(!settled){settled=true;resolve();}};const voice={audio,done};voices.add(voice);if(loop)music=voice;
   const dispose=()=>{voices.delete(voice);if(music===voice)music=null;audio.destroy();};
   audio.onEnded(()=>{done();dispose();});audio.onError((e:any)=>{dispose();if(!settled){settled=true;reject(new Error('音频载入失败：'+asset+' '+(e.errMsg??'')));}});if(loop)audio.onPlay(done);
   audio.src=media(asset);audio.volume=Math.max(0,Math.min(1,volume));audio.loop=loop;audio.play();
  });
 },
 stopMusic(){if(music){const voice=music;music=null;voice.done();voice.audio.stop();voice.audio.destroy();voices.delete(voice);}},
 cancel(){for(const voice of voices){voice.done();voice.audio.stop();voice.audio.destroy();}voices.clear();music=null;},
 pause(value:boolean){for(const voice of voices)value?voice.audio.pause():voice.audio.play();},
 lifecycle(hide:()=>void,show:()=>void){host.onHide(hide);host.onShow(show);return()=>{host.offHide?.(hide);host.offShow?.(show);};}
};
