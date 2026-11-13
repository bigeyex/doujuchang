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
