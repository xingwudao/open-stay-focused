import {readdir,readFile,mkdir,writeFile,stat,access} from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const root=path.resolve('extension');
async function walk(dir){const all=[];for(const name of (await readdir(dir)).sort()){const file=path.join(dir,name),info=await stat(file);if(info.isDirectory())all.push(...await walk(file));else all.push(file);}return all;}
const files=await walk(root),manifest=JSON.parse(await readFile(path.join(root,'manifest.json'),'utf8'));
const expected=['manifest.json',manifest.background.service_worker,manifest.action.default_popup,manifest.options_ui.page,...Object.values(manifest.icons),...manifest.content_scripts.flatMap(s=>s.js??[])];
for(const ref of expected)await access(path.join(root,ref));
for(const file of files){
 if(!/\.(js|html|css|json|png)$/.test(file))throw Error(`Unexpected package file: ${file}`);
 if(file.endsWith('.js'))execFileSync(process.execPath,['--check',file],{stdio:'pipe'});
 if(file.endsWith('.html')){const html=await readFile(file,'utf8');for(const [,ref] of html.matchAll(/(?:src|href)="([^"#]+)"/g))if(!ref.includes('://'))await access(path.resolve(path.dirname(file),ref));}
}
if(manifest.version!==JSON.parse(await readFile('package.json','utf8')).version)throw Error('Package and manifest versions differ.');
if(process.argv.includes('--check')){console.log(`Validated ${files.length} extension files for v${manifest.version}.`);process.exit(0);}
// Small deterministic ZIP writer (stored entries, no external packaging tools).
function crc32(bytes){let crc=0xffffffff;for(const b of bytes){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
const local=[],central=[];let offset=0;
for(const file of files){
 const name=Buffer.from(path.relative(root,file).split(path.sep).join('/')),data=await readFile(file),crc=crc32(data);
 const header=Buffer.alloc(30);header.writeUInt32LE(0x04034b50);header.writeUInt16LE(20,4);header.writeUInt16LE(0x5c21,12);header.writeUInt32LE(crc,14);header.writeUInt32LE(data.length,18);header.writeUInt32LE(data.length,22);header.writeUInt16LE(name.length,26);
 local.push(header,name,data);
 const cd=Buffer.alloc(46);cd.writeUInt32LE(0x02014b50);cd.writeUInt16LE(20,4);cd.writeUInt16LE(20,6);cd.writeUInt16LE(0x5c21,14);cd.writeUInt32LE(crc,16);cd.writeUInt32LE(data.length,20);cd.writeUInt32LE(data.length,24);cd.writeUInt16LE(name.length,28);cd.writeUInt32LE(offset,42);central.push(cd,name);offset+=header.length+name.length+data.length;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(files.length,8);end.writeUInt16LE(files.length,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const zip=Buffer.concat([...local,directory,end]),filename=`open-stay-focused-${manifest.version}.zip`;
await mkdir('dist',{recursive:true});await writeFile(`dist/${filename}`,zip);await writeFile('dist/SHA256SUMS',`${createHash('sha256').update(zip).digest('hex')}  ${filename}\n`);
console.log(`Created dist/${filename} (${zip.length} bytes, ${files.length} files).`);
