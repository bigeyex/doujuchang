import React from 'react';
import {ImagePlus,X} from 'lucide-react';
export default function AssetField({label,value,onChoose,onChange}){
 return <div className="asset-field"><span>{label}（可选）</span><div>{value&&<img src={'/'+value} alt=""/>}<button className="button" onClick={()=>onChoose(file=>onChange(file))}><ImagePlus size={15}/>{value?'替换图片':'上传图片'}</button>{value&&<button title={'移除'+label} onClick={()=>onChange(undefined)}><X size={14}/></button>}</div></div>;
}
