import fs from 'node:fs/promises';
import path from 'node:path';
import {createWriteStream} from 'node:fs';
import {once} from 'node:events';
import {deflateRawSync} from 'node:zlib';
const table=Array.from({length:256},(_,i)=>{let n=i;for(let j=0;j<8;j++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc32=bytes=>{let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return (n^0xffffffff)>>>0;};
export async function listFiles(directory,prefix=''){
 const files=[];for(const e of await fs.readdir(directory,{withFileTypes:true})){const relative=prefix+e.name;if(e.isSymbolicLink())throw Error('不支持符号链接：'+relative);if(e.isDirectory())files.push(...await listFiles(path.join(directory,e.name),relative+'/'));else if(e.isFile())files.push(relative);}return files.sort();
}
export async function zipDirectory(directory,destination,prefix=''){
 const stream=createWriteStream(destination),closed=once(stream,'close'),entries=[];let offset=0;
 const write=async bytes=>{offset+=bytes.length;if(!stream.write(bytes))await once(stream,'drain');};
 try{
  for(const file of await listFiles(directory)){
   const raw=await fs.readFile(path.join(directory,file)),data=deflateRawSync(raw,{level:6}),name=Buffer.from(prefix+file),crc=crc32(raw),local=Buffer.alloc(30),entryOffset=offset;
   local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(0x800,6);local.writeUInt16LE(8,8);local.writeUInt16LE(33,12);local.writeUInt32LE(crc,14);local.writeUInt32LE(data.length,18);local.writeUInt32LE(raw.length,22);local.writeUInt16LE(name.length,26);
   await write(local);await write(name);await write(data);
   const central=Buffer.alloc(46);central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);central.writeUInt16LE(0x800,8);central.writeUInt16LE(8,10);central.writeUInt16LE(33,14);central.writeUInt32LE(crc,16);central.writeUInt32LE(data.length,20);central.writeUInt32LE(raw.length,24);central.writeUInt16LE(name.length,28);central.writeUInt32LE(entryOffset,42);entries.push(Buffer.concat([central,name]));
  }
  const centralOffset=offset;for(const entry of entries)await write(entry);const centralSize=offset-centralOffset,end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(centralSize,12);end.writeUInt32LE(centralOffset,16);await write(end);stream.end();await closed;
 }catch(error){stream.destroy();await closed.catch(()=>{});throw error;}
}
