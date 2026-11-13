import {dialogueLayout} from '../core/layout.js';
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const round=v=>Math.round(v*10000)/10000;
export function dimensions(display){return display.orientation==='portrait'?{width:display.shortEdge,height:display.longEdge}:{width:display.longEdge,height:display.shortEdge};}
export function transformRect(rect,dx,dy,resize=false,snap=true){
  if(resize)return {...rect,w:round(clamp(rect.w+dx*2,.015,2)),h:round(clamp(rect.h+dy*2,.015,2))};
  let x=clamp(rect.x+dx,0,1),y=clamp(rect.y+dy,0,1);
  if(snap){if(Math.abs(x-.5)<.008)x=.5;if(Math.abs(y-.5)<.008)y=.5;}
  return {...rect,x:round(x),y:round(y)};
}
export const resizeHandles=['nw','n','ne','e','se','s','sw','w'];
export function resizeRect(rect,dx,dy,handle,aspect=handle.length===2){
 const sx=handle.includes('w')?-1:handle.includes('e')?1:0,sy=handle.includes('n')?-1:handle.includes('s')?1:0;
 let w=rect.w+(sx?dx*sx:0),h=rect.h+(sy?dy*sy:0);
 if(aspect&&sx&&sy){const rw=w/rect.w,rh=h/rect.h,factor=Math.max(.015/Math.min(rect.w,rect.h),Math.abs(rw-1)>Math.abs(rh-1)?rw:rh);w=rect.w*factor;h=rect.h*factor;}
 w=clamp(w,.015,8);h=clamp(h,.015,8);
 return {...rect,x:round(rect.x+(w-rect.w)*sx/2),y:round(rect.y+(h-rect.h)*sy/2),w:round(w),h:round(h)};
}
export const defaultDialogueParts={speaker:dialogueLayout().speaker,text:dialogueLayout().text};
export function dialoguePartRect(dialogue,key){const part={...defaultDialogueParts[key],...dialogue[key]};return {...part,x:dialogue.x+(part.x-.5)*dialogue.w,y:dialogue.y+(part.y-.5)*dialogue.h,w:part.w*dialogue.w,h:part.h*dialogue.h};}
