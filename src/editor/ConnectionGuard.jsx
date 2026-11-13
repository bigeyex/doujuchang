import React,{useEffect,useState} from 'react';
export default function ConnectionGuard(){
 const [offline,setOffline]=useState(false);
 useEffect(()=>{let alive=true,timer,disconnected=false;const controller=new AbortController();const check=async()=>{try{const response=await fetch('/api/health',{cache:'no-store',signal:AbortSignal.any([controller.signal,AbortSignal.timeout(4000)])});const data=await response.json();if(!response.ok||data.service!=='avg-maker')throw Error();if(alive){setOffline(false);if(disconnected){disconnected=false;window.dispatchEvent(new Event('avg-connection-restored'));}}}catch{if(alive){disconnected=true;setOffline(true);}}finally{if(alive)timer=setTimeout(check,3000);}};check();return()=>{alive=false;clearTimeout(timer);controller.abort();};},[]);
 return offline?<div className="modal-backdrop connection-lost"><div className="modal" role="alertdialog" aria-modal="true" aria-label="编辑器已断开连接"><div className="modal-head"><strong>编辑器已断开连接</strong></div><p>告诉豆包工作“启动编辑器”来继续。</p><p className="connection-note">连接恢复后会自动继续，当前页面的编辑内容会保留。</p></div></div>:null;
}
