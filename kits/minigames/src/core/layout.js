export function backgroundRect(background,width,height){
 const rect=background.rect,reference=background.reference;if(!rect||!reference)return rect;
 const scale=Math.max(width/reference.width,height/reference.height),xScale=reference.width*scale/width,yScale=reference.height*scale/height;
 return {...rect,x:.5+(rect.x-.5)*xScale,y:.5+(rect.y-.5)*yScale,w:rect.w*xScale,h:rect.h*yScale};
}

export function dialogueScreen(project,screenId){return project.screens.find(s=>s.id===screenId&&s.dialogue)??project.screens.find(s=>s.id===project.defaultScreen&&s.dialogue)??project.screens.find(s=>s.dialogue);}

// Shared by the design canvas and Cocos player. Coordinates are normalized;
// child coordinates are relative to the dialogue box.
export function dialogueLayout(dialogue={},theme={}){
 const d={x:.5,y:.87,w:1,h:.26,fontSize:29,color:'#453d36',background:'#f4eddf',opacity:255,...dialogue};
 return {...d,speaker:{x:.16,y:0,w:.24,h:.145,fontSize:25,color:'#f4eddf',background:theme.ink??'#453d36',...d.speaker},text:{x:.5,y:.36,w:.9,h:.56,fontSize:d.fontSize,color:d.color,...d.text}};
}

export function defaultStartupScreen(id='splash'){
 const zh=/[\p{Script=Han}]/u.test(id);
 return {id,name:'启动画面',kind:'splash',color:'#181c24',controls:[
  {id:zh?'项目图标':'startup-icon',name:'项目图标',type:'image',source:'projectIcon',x:.5,y:.4,w:.2,h:.1125},
  {id:zh?'品牌名称':'startup-name',name:'项目名称',type:'text',source:'projectName',x:.5,y:.54,w:.8,h:.07,fontSize:46,color:'#ead4ae'},
  {id:zh?'引擎署名':'startup-credit',name:'引擎署名',type:'text',text:'powered by 豆剧场, Cocos Engine',x:.5,y:.61,w:.85,h:.045,fontSize:22,color:'#929bab'}
 ]};
}
export function withStartupScreen(project){
 let screen=project.screens.find(s=>s.id===project.splash?.screen&&s.kind==='splash')??project.screens.find(s=>s.kind==='splash');
 if(!screen){let id=/[\p{Script=Han}]/u.test(project.startScreen??'')?'启动画面':'splash';while(project.screens.some(s=>s.id===id))id+='_';screen=defaultStartupScreen(id);}
 return {...project,splash:{enabled:true,duration:1.2,...project.splash,screen:screen.id},screens:project.screens.includes(screen)?project.screens:[screen,...project.screens]};
}
export function startupSettings(project){
 const p=withStartupScreen(project),duration=Number(p.splash.duration);
 return {...p.splash,duration:Number.isFinite(duration)?Math.max(0,Math.min(10,duration)):1.2,screen:p.screens.find(s=>s.id===p.splash.screen)};
}
export function controlImage(project,control){return control.source==='projectIcon'?project.icon:control.image;}

export function controlText(project,control){return control.source==='projectName'?project.name:control.text??control.name??'';}
