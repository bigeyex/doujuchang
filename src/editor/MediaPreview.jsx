import React,{useEffect,useRef} from 'react';
import {Music2,Film} from 'lucide-react';
export default function MediaPreview({media}){
 const player=useRef(null),video=media?.kind==='video'||media?.file?.toLowerCase().endsWith('.mp4');
 useEffect(()=>{if(player.current)player.current.volume=media.volume??1;},[media?.volume]);
 useEffect(()=>()=>{player.current?.pause();},[media?.id]);
 return <div className="media-workspace">{media?<><div className={'media-stage '+(video?'video-stage':'audio-stage')}>{video?<video key={media.id} ref={player} src={'/'+media.file} controls playsInline preload="metadata"/>:<><Music2 size={64} strokeWidth={1}/><audio key={media.id} ref={player} src={'/'+media.file} controls preload="metadata"/></>}</div><div className="media-caption">{video?<Film size={15}/>:<Music2 size={15}/>}<span>{media.name}</span></div></>:<div className="empty"><Music2 size={32}/></div>}</div>;
}
