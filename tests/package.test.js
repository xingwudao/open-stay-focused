import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const version=JSON.parse(readFileSync('package.json','utf8')).version;
test('package is reproducible and contains only extension assets with root manifest',()=>{
 execFileSync(process.execPath,['scripts/package.mjs']);const a=readFileSync(`dist/open-stay-focused-${version}.zip`);
 execFileSync(process.execPath,['scripts/package.mjs']);const b=readFileSync(`dist/open-stay-focused-${version}.zip`);assert.deepEqual(a,b);
 const entries=[];let at=0;
 while(a.readUInt32LE(at)===0x04034b50){const size=a.readUInt32LE(at+18),n=a.readUInt16LE(at+26),extra=a.readUInt16LE(at+28);entries.push(a.subarray(at+30,at+30+n).toString());at+=30+n+extra+size;}
 assert.ok(entries.includes('manifest.json'));assert.ok(entries.includes('background.js'));assert.ok(entries.includes('ui/options.html'));
 assert.ok(entries.every(n=>!/(node_modules|tests|research|secret|\.git)/.test(n)));
 assert.ok(readFileSync('dist/SHA256SUMS','utf8').includes(createHash('sha256').update(a).digest('hex')));
});
