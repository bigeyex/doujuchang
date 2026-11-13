import React from 'react';
import {Field} from './Fields.jsx';
import AssetField from './AssetField.jsx';
import {defaultDialogueParts} from './ui-geometry.js';
export default function DialogueInspector({dialogue={},selected,onChange,onChoose}){
 const key=selected==='__speaker'?'speaker':selected==='__text'?'text':null,value=key?{...defaultDialogueParts[key],...dialogue[key]}:dialogue;
 const patch=(property,value)=>onChange(d=>{if(key){d[key]??={...defaultDialogueParts[key]};d[key][property]=value;}else d[property]=value;});
 return <section className="inspector-section"><div className="section-heading">{key==='speaker'?'人物姓名':key==='text'?'对话文本':'对话框'}</div><div className="form-grid">{[['x','X'],['y','Y'],['w','宽'],['h','高']].map(([property,label])=><Field required key={property} label={label} type="number" step={.01} value={value[property]} onChange={v=>patch(property,v)}/>)}</div>{key?<><Field label="字号" type="number" value={value.fontSize} onChange={v=>patch('fontSize',v)}/><Field label="文字颜色" type="color" value={value.color} onChange={v=>patch('color',v)}/></>:<Field label="背景颜色" type="color" value={value.background??'#f4eddf'} onChange={v=>patch('background',v)}/>}{key==='speaker'&&<Field label="背景颜色" type="color" value={value.background??'#453d36'} onChange={v=>patch('background',v)}/>}<AssetField label="背景图片" value={value.image} onChoose={onChoose} onChange={v=>patch('image',v)}/></section>;
}
