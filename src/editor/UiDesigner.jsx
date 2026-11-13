import React,{useEffect,useRef,useState} from 'react';
import {dimensions,transformRect,resizeRect,resizeHandles,dialoguePartRect} from './ui-geometry.js';
import {dialogueLayout} from '../core/layout.js';
import {evaluate,interpolate} from '../core/expression.js';

export const controlTypes=[['text','文本','Type'],['button','按钮','SquareMousePointer'],['image','图片','Image'],['panel','面板','PanelsTopLeft'],['progress','进度条','ChartNoAxesColumnIncreasing'],['slider','滑条','SlidersHorizontal'],['toggle','开关','ToggleLeft'],['input','输入框','TextCursorInput'],['history','对话历史','BookOpen']];
const rectStyle=c=>({left:`${(c.x-c.w/2)*100}%`,top:`${(c.y-c.h/2)*100}%`,width:`${c.w*100}%`,height:`${c.h*100}%`});
export default function UiDesigner({project,screen,selectedId,onSelect,onChange}){
 const host=useRef(null),board=useRef(null),[bounds,setBounds]=useState({width:600,height:800}),[zoom,setZoom]=useState(1),[draft,setDraft]=useState(null);
 const {width,height}=dimensions(project.display),scale=Math.max(.05,Math.min((bounds.width-88)/width,(bounds.height-76)/height))*zoom;
 const variables=Object.fromEntries(Object.entries(project.variables).map(([k,v])=>[k,v.default]));
 const read=(expr,fallback)=>{try{return evaluate(expr,variables);}catch{return fallback;}};
 const text=value=>{try{return interpolate(value??'',variables);}catch{return value??'';}};
 const paper=project.theme?.paper,ink=project.theme?.ink??'#453d36',accent=project.theme?.accent??'#b79b6f';
 useEffect(()=>{const observer=new ResizeObserver(([entry])=>setBounds(entry.contentRect));observer.observe(host.current);return()=>observer.disconnect();},[]);
 useEffect(()=>{setDraft(null);},[screen.id]);
 const write=(id,rect)=>onChange(s=>{if(['__speaker','__text'].includes(id)){const key=id==='__speaker'?'speaker':'text',d=s.dialogue;d[key]={...d[key],x:(rect.x-d.x)/d.w+.5,y:(rect.y-d.y)/d.h+.5,w:rect.w/d.w,h:rect.h/d.h};}else{const c=id==='__dialogue'?s.dialogue:s.controls.find(c=>c.id===id);Object.assign(c,{x:rect.x,y:rect.y,w:rect.w,h:rect.h});}});
 const begin=(e,c,resize=false)=>{
  if(e.button!==0)return;e.stopPropagation();e.preventDefault();host.current.focus({preventScroll:true});onSelect(c.id);
  const target=e.currentTarget,b=board.current.getBoundingClientRect(),start={x:e.clientX,y:e.clientY};let next=c;
  target.setPointerCapture(e.pointerId);
  const move=ev=>{const dx=(ev.clientX-start.x)/b.width,dy=(ev.clientY-start.y)/b.height;next=resize?resizeRect(c,dx,dy,resize):transformRect(c,dx,dy,false,!ev.altKey);setDraft({id:c.id,rect:next});};
  const finish=ev=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',cancel);if(ev.type==='pointerup'&&(next.x!==c.x||next.y!==c.y||next.w!==c.w||next.h!==c.h))write(c.id,next);setDraft(null);};
  const cancel=()=>{target.removeEventListener('pointermove',move);target.removeEventListener('pointerup',finish);target.removeEventListener('pointercancel',cancel);setDraft(null);};
  target.addEventListener('pointermove',move);target.addEventListener('pointerup',finish);target.addEventListener('pointercancel',cancel);
 };
 const selected=selectedId==='__dialogue'?screen.dialogue:selectedId==='__speaker'?dialoguePartRect(screen.dialogue,'speaker'):selectedId==='__text'?dialoguePartRect(screen.dialogue,'text'):screen.controls.find(c=>c.id===selectedId);
 const background=project.backgrounds.find(b=>b.id===screen.background);
 const effectiveDialogue=screen.dialogue?dialogueLayout(draft?.id==='__dialogue'?{...screen.dialogue,...draft.rect}:screen.dialogue,project.theme):null;
 const controls=[...screen.controls,...(effectiveDialogue?[{...effectiveDialogue,id:'__dialogue',name:'对话框',type:'dialogue'},{...dialoguePartRect(effectiveDialogue,'speaker'),id:'__speaker',name:'人物姓名',type:'speaker'},{...dialoguePartRect(effectiveDialogue,'text'),id:'__text',name:'对话文本',type:'dialogueText'}]:[])];
 return <div className="ui-designer" ref={host} tabIndex={0} aria-label="界面设计画布" onKeyDown={e=>{
  if(!selected||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();
  const step=e.shiftKey?10:1,dx=({ArrowLeft:-step,ArrowRight:step}[e.key]??0)/width,dy=({ArrowUp:-step,ArrowDown:step}[e.key]??0)/height;
  write(selectedId,transformRect(selected,dx,dy,false,false));
 }}>
  <div className="designer-tools"><button title="水平居中" disabled={!selected} onClick={()=>write(selectedId,{...selected,x:.5})}>↔</button><button title="垂直居中" disabled={!selected} onClick={()=>write(selectedId,{...selected,y:.5})}>↕</button><span/><button title="缩小画布" onClick={()=>setZoom(z=>Math.max(.5,z-.25))}>−</button><button title="适合画布" onClick={()=>setZoom(1)}>{Math.round(scale*100)}%</button><button title="放大画布" onClick={()=>setZoom(z=>Math.min(3,z+.25))}>＋</button></div>
  <div className="design-scroll"><div className="artboard-wrap" style={{width:width*scale,height:height*scale}}><span className="artboard-dimensions">{width} × {height}</span><div className="design-artboard" ref={board} style={{width,height,transform:`scale(${scale})`,'--ink':ink,'--accent':accent,'--paper':paper?`url(/${paper})`:'none'}} onPointerDown={()=>onSelect(null)}>
   {background&&<img className="design-background" src={'/'+background.image} style={{objectFit:background.fit??'cover',objectPosition:`${(background.focusX??.5)*100}% ${(background.focusY??.5)*100}%`}}/>}
   {background&&screen.id===project.startScreen&&<div className="design-title-shade"/>}
   {screen.kind==='popup'&&<><div className="design-shade"/><div className="design-popup paper-panel"><span>{screen.title??screen.name}</span></div></>}
   {controls.map(original=>{const c=draft?.id===original.id?{...original,...draft.rect}:original,selected=c.id===selectedId;const ratio=Math.max(0,Math.min(1,read(c.value??c.bind??'0',0)/Math.max(1,read(c.max??'100',100))));
    return <div key={c.id} role="button" aria-label={'选择 '+c.name} aria-pressed={selected} className={'design-element '+(selected?'selected ':'')+`design-${c.type}`} style={{...rectStyle(c),fontSize:c.fontSize??28,fontFamily:c.fontFamily,color:c.type==='text'?c.color:(c.textColor??ink),'--fill':c.color??'#f4eddf','--radius':`${c.radius??6}px`}} onPointerDown={e=>begin(e,c)}>
     {c.type==='text'?<span>{text(c.text)}</span>:c.type==='image'?(c.image?<img src={'/'+c.image}/>:<span className="empty-image">◇</span>):c.type==='progress'||c.type==='slider'?<div className="design-track" style={{backgroundImage:c.trackImage?`url(/${c.trackImage})`:undefined}}><i style={{width:`${ratio*100}%`,backgroundImage:c.fillImage?`url(/${c.fillImage})`:undefined,backgroundSize:c.fillImage?`${100/Math.max(ratio,.0001)}% 100%`:undefined,backgroundPosition:'left center'}}/>{c.type==='slider'&&<b style={{left:`${ratio*100}%`}}/>}</div>:c.type==='dialogue'?<div className="design-dialogue-surface" style={{backgroundColor:c.background,color:c.color,opacity:c.opacity/255,backgroundImage:c.image?`url(/${c.image})`:undefined}}><svg className="design-advance-hint" viewBox="-14 -10 28 20" aria-hidden="true"><path d="M-9 -4 L0 4 L9 -4"/></svg></div>:c.type==='speaker'?<div className="design-speaker-part" style={{backgroundColor:c.background,backgroundImage:c.image?`url(/${c.image})`:undefined,color:c.color}}>{project.characters[0]?.name??'人物'}</div>:c.type==='dialogueText'?<div className="design-dialogue-text" style={{color:c.color,backgroundImage:c.image?`url(/${c.image})`:undefined}}>明天的节目单上，会有我们的名字吗？</div>:c.type==='history'?<div className="design-history">林夏<br/>节目单上为什么没有我们班？<hr/>陈默<br/>我们一起去查清楚。</div>:c.type==='panel'?<div className="design-panel" style={{backgroundImage:c.image?`url(/${c.image})`:undefined}}/>:<div className="design-widget" style={{backgroundImage:(c.type==='toggle'?(read(c.bind??'false',false)?c.onImage:c.offImage):c.image)?`url(/${c.type==='toggle'?(read(c.bind??'false',false)?c.onImage:c.offImage):c.image})`:undefined}}>{c.type==='toggle'&&!c.onImage&&!c.offImage&&<i className={'design-toggle '+(read(c.bind??'false',false)?'on':'')}/>}<span>{c.type==='input'?String(read(c.bind??'0',c.text)):text(c.text??c.name)}</span></div>}
     {selected&&<><span className="design-selection-label" style={{fontSize:11/scale}}>{c.name}</span>{resizeHandles.map(handle=><i key={handle} role="button" aria-label={'调整 '+c.name+' '+handle} className={'resize-handle handle-'+handle} style={{'--handle-size':8/scale+'px'}} onPointerDown={e=>begin(e,c,handle)}/>)}</>}
    </div>;
   })}
   {draft&&<>{Math.abs(draft.rect.x-.5)<.001&&<i className="design-guide vertical"/>}{Math.abs(draft.rect.y-.5)<.001&&<i className="design-guide horizontal"/>}</>}
  </div></div></div>
 </div>;
}
