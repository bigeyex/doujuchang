import {compileProject,resolveTarget,ScriptError} from './compiler.js';
import {defaults,evaluate,interpolate,validateValue} from './expression.js';
import {renderText} from './text.js';

export class Runtime {
  constructor(project,adapter={},onChange=()=>{}) {this.project=project;this.compiled=compileProject(project);this.adapter=adapter;this.onChange=onChange;this.generation=0;this.reset();}
  reset(){this.variables=defaults(this.project);this.script=this.compiled.entry;this.pc=0;this.stack=[];this.contexts=[];this.pending=null;this.stage={background:null,characters:{}};this.popups=[];this.screen=this.project.defaultScreen??'game';this.status='idle';this.error=null;this.location=null;this.paused=false;this.steps=0;this.eventsBusy=false;this.history=[];}
  emit(){this.onChange(this.snapshot());}
  snapshot(){return {history:this.history.map(entry=>({...entry})),variables:{...this.variables},script:this.script,pc:this.pc,stack:this.stack.map(s=>({...s})),contexts:this.contexts.map(c=>({script:c.script,pc:c.pc})),pending:this.pending?{...this.pending}:null,stage:structuredClone(this.stage),popups:[...this.popups],screen:this.screen,status:this.status,error:this.error?{message:this.error.message,script:this.error.script,line:this.error.line}:null,location:this.location,paused:this.paused};}
  async start(entry=this.compiled.entry,overrides={},options={}){this.stop(false);this.reset();this.entryIsMain=!options.quick;if(this.compiled.errors.length){this.fail(this.compiled.errors[0]);return;}if(!this.compiled.scripts[entry]){this.fail(new Error(`未知脚本：${entry}`));return;}for(const [path,v]of Object.entries(overrides))this.setVariable(path,v,false);this.script=entry;this.pc=0;this.stack=[{testRoot:true}];this.status='running';this.emit();await this.pump();}
  stop(emit=true){this.generation++;this.adapter.cancel?.();this.running=false;this.pending=null;this.contexts=[];this.stack=[];this.popups=[];this.status='stopped';if(emit)this.emit();}
  fail(error){this.error=error instanceof ScriptError?error:new ScriptError(error.message,this.location?.script??this.script,this.location?.line??1);this.status='error';this.pending=null;this.emit();}
  setVariable(path,value,emit=true){validateValue(this.project.variables[path],value);this.variables[path]=value;if(this.pending?.kind==='choice')this.refreshChoice();if(emit)this.emit();}
  value(v){return v?.expr?evaluate(v.expr,this.variables):v;}
  args(values){return Object.fromEntries(Object.entries(values??{}).map(([k,v])=>[k,this.value(v)]));}
  jump(target){Object.assign(this,resolveTarget(this.compiled,this.script,target));}
  refreshChoice(){const op=this.pending?.instruction;if(!op)return;this.pending.options=op.options.map((o,index)=>({...o,index,text:o.text?.expr?String(this.value(o.text)):interpolate(o.text,this.variables),enabled:o.condition?this.condition(o.condition):true})).filter(o=>o.enabled||o.unavailable==='disable');}
  condition(ast){const value=evaluate(ast,this.variables);if(typeof value!=='boolean')throw new Error('条件需要布尔值');return value;}
  async advance(index){if(this.paused||!this.pending)return;try{const p=this.pending;if(p.kind==='dialogue'||p.kind==='click'){this.pending=null;}else if(p.kind==='choice'){this.refreshChoice();const option=this.pending.options.find(o=>o.index===index&&o.enabled);if(!option)return;this.pending=null;this.jump(option.to);}else return;this.status='running';await this.pump();}catch(e){this.fail(e);}}
  pause(value=!this.paused){this.paused=value;this.adapter.pause?.(value);this.emit();if(!value&&!this.pending)this.pump();}
  async step(){if(!this.paused)return;this.paused=false;await this.pump(true);this.paused=true;this.emit();}
  closePopup(id){id=id??this.popups.at(-1);const index=this.popups.indexOf(id);if(index<0)throw new Error(`弹窗未打开：${id}`);const closed=this.popups.splice(index);for(const state of [this,...this.contexts])if(state.pending?.kind==='popup'&&closed.includes(state.pending.screen))state.pending.closed=true;this.emit();}
  async callUI(target,{closeAfter,closeBefore}={}){if(this.running||this.status==='done'||this.status==='error'||this.paused)return false;if(this.contexts.length>16)throw new Error('界面嵌套过深');const owner=this.popups.at(-1);const saved={script:this.script,pc:this.pc,stack:this.stack,pending:this.pending,status:this.status,owner,closeAfter:closeAfter?owner:null};if(closeBefore&&owner)this.closePopup(owner);this.contexts.push(saved);this.pending=null;this.stack=[{uiRoot:true}];this.jump(target);this.status='running';this.emit();await this.pump();return true;}
  returnFromCall(explicit=false){const frame=this.stack.pop();if(!frame){if(explicit)throw new Error('return 没有对应 call');this.status='done';return;}
    if(frame.uiRoot){const saved=this.contexts.pop();if(saved.closeAfter&&this.popups.includes(saved.closeAfter))this.closePopup(saved.closeAfter);Object.assign(this,{script:saved.script,pc:saved.pc,stack:saved.stack,pending:saved.pending,status:saved.status});if(this.pending?.kind==='popup'&&this.pending.closed)this.pending=null;if(saved.status==='idle'&&!this.pending)this.pending={kind:'uiidle'};return;}
    if(frame.testRoot){if(explicit&&this.entryIsMain)throw new Error('入口 return 没有对应 call');this.status='done';return;}
    this.script=frame.script;this.pc=frame.pc;
  }
  async pump(single=false){if(this.running||this.paused||this.status==='stopped'||this.status==='error'||this.status==='done')return;this.running=true;const generation=this.generation;let budget=0;
    try{
      while(generation===this.generation&&!this.pending&&!this.paused&&this.status!=='done'){
        const op=this.compiled.scripts[this.script]?.ops[this.pc];if(!op){this.returnFromCall();if(this.status==='done'){this.emit();break;}continue;}
        this.location={script:this.script,line:op.line};this.pc++;this.status='running';this.steps++;if(++budget>20000)throw new Error('连续计算超过上限，请检查 while 是否能够结束');
        switch(op.op){
          case 'jz':if(!this.condition(op.test))this.pc=op.to;break;
          case 'goto':this.pc=op.to;break;
          case 'set':{let v=evaluate(op.value,this.variables);if(op.operator!=='='){const a=this.variables[op.path];if(typeof a!=='number'||typeof v!=='number')throw new Error('复合赋值需要数字');v=evaluate({type:'binary',op:op.operator[0],left:{type:'literal',value:a},right:{type:'literal',value:v}},this.variables);}this.setVariable(op.path,v,false);break;}
          case 'jump':this.jump(op.args.to);break;
          case 'call':if(this.stack.length>128)throw new Error('调用栈过深');this.stack.push({script:this.script,pc:this.pc,line:op.line});this.jump(op.args.to);break;
          case 'return':this.returnFromCall(true);break;
          case 'end':this.pending=null;this.stack=[];this.contexts=[];this.popups=[];this.status='done';break;
          case 'say':this.pending={kind:'dialogue',character:op.character,...renderText(op.rich,this.variables)};this.history.push({character:op.character,name:this.project.characters.find(c=>c.id===op.character)?.name??'',text:this.pending.text,script:this.script,line:op.line});if(this.history.length>1000)this.history.shift();this.status='dialogue';budget=0;break;
          case 'choice':this.pending={kind:'choice',instruction:op,options:[]};this.refreshChoice();if(!this.pending.options.some(o=>o.enabled)){if(op.fallback){this.pending=null;this.jump(op.fallback);}else throw new Error('没有可选择的选项');}else this.status='choice';budget=0;break;
          case 'wait':{const args=this.args(op.args);if(args.duration===undefined){this.pending={kind:'click'};this.status='click';}else await this.effect('wait',args,generation);budget=0;break;}
          case 'background':{const args=this.args(op.args);this.stage.background=args.id;this.emit();await this.effect(op.op,args,generation);budget=0;break;}
          case 'show':{const args=this.args(op.args);const char=this.project.characters.find(c=>c.id===args.character);const pose=char?.poses.find(p=>p.id===(args.pose??char?.poses[0]?.id));if(!pose)throw new Error(`未知立绘：${args.pose}`);for(const [id,p]of Object.entries(this.stage.characters))if(p.character===char.id)delete this.stage.characters[id];const at=args.at??'center';let slot=args.slot??0;if(!Number.isInteger(slot)||slot<0)throw new Error('槽位必须是非负整数');if(args.mode==='add'&&args.slot===undefined){while(Object.values(this.stage.characters).some(p=>(p.at??'center')===at&&(p.slot??0)===slot))slot++;}for(const [id,p]of Object.entries(this.stage.characters))if(p.character===args.character||(p.at??'center')===at&&(p.slot??0)===slot)delete this.stage.characters[id];const instance=char.id;this.stage.characters[instance]={...args,at,slot,pose:pose.id,character:char.id};this.emit();await this.effect(op.op,{...args,at,slot,instance},generation);budget=0;break;}
          case 'hide':{const args=this.args(op.args);await this.effect(op.op,args,generation);if(generation!==this.generation)break;for(const [id,p]of Object.entries(this.stage.characters))if(!args.target||p.character===args.target)delete this.stage.characters[id];budget=0;break;}
          case 'animate':{const args=this.args(op.args);await this.effect('animate',args,generation);budget=0;break;}
          case 'sound':case 'music':case 'video':await this.effect(op.op,this.args(op.args),generation);budget=0;break;
          case 'uiswitch':this.screen=this.value(op.args.screen);await this.effect(op.op,this.args(op.args),generation);budget=0;break;
          case 'uipopup':{const id=this.value(op.args.screen);if(this.popups.includes(id))throw new Error('同一弹窗已打开');this.popups.push(id);this.pending={kind:'popup',screen:id,closed:false};this.status='popup';budget=0;break;}
          case 'uiclose':{const args=this.args(op.args);this.closePopup(args.screen??this.contexts.at(-1)?.owner);await this.effect(op.op,args,generation);if(this.pending?.kind==='popup'&&this.pending.closed)this.pending=null;break;}
          default:throw new Error(`未实现的指令：${op.op}`);
        }
        if(generation!==this.generation)break;this.emit();if(single)break;if(budget%200===0)await new Promise(r=>setTimeout(r,0));
      }
    }catch(e){if(generation===this.generation)this.fail(e);}finally{if(generation===this.generation){this.running=false;this.emit();}}
  }
  async effect(name,args,generation){this.status='action';this.emit();await this.adapter.effect?.(name,args,this);if(generation===this.generation)this.status='running';}
  save(){if(this.running||this.contexts.length||!this.pending||!['dialogue','choice','popup','click'].includes(this.pending.kind))throw new Error('请在稳定交互位置保存');return {version:1,fingerprint:JSON.stringify(this.project.scripts.map(s=>[s.id,s.source])),state:this.snapshot()};}
  async load(save){if(save.version!==1||save.fingerprint!==JSON.stringify(this.project.scripts.map(s=>[s.id,s.source])))throw new Error('存档与当前剧本版本不兼容');this.stop(false);this.reset();const s=save.state;for(const [p,v]of Object.entries(s.variables))validateValue(this.project.variables[p],v);Object.assign(this,{history:(s.history??[]).map(entry=>({...entry})),variables:{...s.variables},script:s.script,pc:s.pc,stack:s.stack,pending:s.pending,stage:s.stage,popups:s.popups,screen:s.screen,status:s.status,location:s.location});await this.adapter.restore?.(this);this.emit();}
}
