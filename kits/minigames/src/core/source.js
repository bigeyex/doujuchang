// Replace comments with spaces so compiler diagnostics and editor offsets stay stable.
export function maskComments(source){
 const chars=source.split(''),ranges=[];let block=-1,line=1,blockLine=1,quote=false,escape=false,tag=false,lineStart=0;
 for(let i=0;i<source.length;i++){
  const c=source[i],next=source[i+1];
  if(block>=0){if(c==='*'&&next==='/'){chars[i]=chars[i+1]=' ';ranges.push({from:block,to:i+2});block=-1;i++;}else if(c!=='\n'&&c!=='\r')chars[i]=' ';if(c==='\n'){line++;lineStart=i+1;}continue;}
  if(c==='\n'){line++;lineStart=i+1;quote=false;tag=false;escape=false;continue;}
  if(c==='/'&&next==='/'&&!tag&&source.slice(lineStart,i).trim()===''){while(i<source.length&&source[i]!=='\n')i++;i--;continue;}
  if(c==='['&&!source.slice(lineStart,i).trim())tag=true;
  if(tag&&c==='"'&&!escape)quote=!quote;
  if(!quote&&!escape&&c==='/'&&next==='*'){block=i;blockLine=line;chars[i]=chars[i+1]=' ';i++;continue;}
  escape=c==='\\'&&!escape;
 }
 return {source:chars.join(''),ranges,error:block<0?null:{line:blockLine,message:'多行注释 /* 未闭合'},openFrom:block};
}
