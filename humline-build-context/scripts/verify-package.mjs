import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

const root=path.resolve(process.argv[2] || fileURLToPath(new URL('../',import.meta.url)));
const manifest=JSON.parse(fs.readFileSync(path.join(root,'MANIFEST.json'),'utf8'));
function list(dir) {
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
    const p=path.join(dir,e.name);return e.isDirectory()?list(p):[path.relative(root,p).split(path.sep).join('/')];
  });
}
const actual=list(root).filter(x=>x!=='MANIFEST.json').sort();
assert.deepEqual(actual,manifest.files.map(f=>f.path).sort(),'Manifest must enumerate all files.');
for(const file of manifest.files) {
  assert(!file.path.split('/').includes('..') && !path.isAbsolute(file.path));
  const bytes=fs.readFileSync(path.join(root,file.path));
  assert.equal(bytes.length,file.bytes,file.path+' size');
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),file.sha256,file.path+' hash');
  assert(!/(^|\/)(node_modules|\.git|\.env)(\/|$)/.test(file.path),'Unexpected private/build artifact');
}
for(const rel of actual.filter(x=>x.endsWith('.md'))) {
  const md=fs.readFileSync(path.join(root,rel),'utf8');
  for(const match of md.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const link=match[1].split('#')[0];
    if(!link || /^https?:/.test(link)) continue;
    assert(fs.existsSync(path.resolve(path.dirname(path.join(root,rel)),link)),`${rel}: broken link ${link}`);
  }
}
const truth=JSON.parse(fs.readFileSync(path.join(root,'fixtures/expected-events.json'),'utf8'));
for(const spec of truth.fixtures) {
  const b=fs.readFileSync(path.join(root,'fixtures',spec.file));
  assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WAVE');
  assert.equal(b.readUInt16LE(20),1);assert.equal(b.readUInt16LE(22),spec.channels);
  assert.equal(b.readUInt32LE(24),spec.sampleRate);assert.equal(b.readUInt16LE(34),16);
  assert.equal(b.readUInt32LE(40),b.length-44);assert.equal(b.readUInt32LE(4),b.length-8);
  const duration=(b.length-44)/(2*spec.channels*spec.sampleRate);
  assert(Math.abs(duration-spec.durationSeconds)<1/spec.sampleRate);
  let peak=0;for(let i=44;i<b.length;i+=2)peak=Math.max(peak,Math.abs(b.readInt16LE(i)));
  if(spec.file==='silence.wav') assert.equal(peak,0);else assert(peak>0&&peak<32767);
  for(const e of spec.events) assert(e.startSeconds>=0&&e.durationSeconds>0&&e.startSeconds+e.durationSeconds<=duration+0.0001);
}
const project=JSON.parse(fs.readFileSync(path.join(root,'fixtures/example-project.json'),'utf8'));
assert.equal(project.schemaVersion,1);assert.equal(project.notes.length,6);
assert.equal(new Set(project.notes.map(n=>n.id)).size,6);
project.notes.forEach((n,i)=>{
  const e=truth.fixtures[0].events[i];assert.equal(n.midi,e.midi);
  assert(Math.abs(n.startBeat*60/project.bpm-e.startSeconds)<1e-9);
  assert(Math.abs(n.durationBeats*60/project.bpm-e.durationSeconds)<1e-9);
});
console.log(JSON.stringify({status:'PASS',filesVerified:manifest.files.length,
  wavFixturesVerified:truth.fixtures.length,checks:['SHA-256 and size','complete file inventory','relative documentation links','WAV structure/duration/levels','expected project timing'],
  scope:'Package integrity only. No Humline app has been implemented or tested.'},null,2));
