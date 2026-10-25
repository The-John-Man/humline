import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(process.argv[2] || fileURLToPath(new URL('../', import.meta.url)));
const out = path.join(root, 'fixtures');
fs.mkdirSync(out, {recursive:true});
const melody = [
  {midi:57,startSeconds:0.35,durationSeconds:0.65},
  {midi:60,startSeconds:1.15,durationSeconds:0.65},
  {midi:64,startSeconds:1.95,durationSeconds:0.95},
  {midi:62,startSeconds:3.05,durationSeconds:0.65},
  {midi:60,startSeconds:3.85,durationSeconds:0.65},
  {midi:57,startSeconds:4.65,durationSeconds:1.2}
];
const repeated = [
  {midi:57,startSeconds:0.2,durationSeconds:0.6},
  {midi:57,startSeconds:1.0,durationSeconds:0.6}
];
const specs = [
  {file:'melody-clean.wav',sampleRate:44100,channels:1,durationSeconds:6.1,events:melody},
  {file:'melody-48k-stereo.wav',sampleRate:48000,channels:2,durationSeconds:6.1,events:melody},
  {file:'repeated-note.wav',sampleRate:44100,channels:1,durationSeconds:1.9,events:repeated},
  {file:'vibrato.wav',sampleRate:44100,channels:1,durationSeconds:2.2,vibrato:true,events:[{midi:57,startSeconds:0.2,durationSeconds:1.8}]},
  {file:'silence.wav',sampleRate:22050,channels:1,durationSeconds:2,events:[]},
  {file:'noise.wav',sampleRate:22050,channels:1,durationSeconds:2,noise:true,events:[]}
];
function wav(spec) {
  const count=Math.round(spec.durationSeconds*spec.sampleRate);
  const audio=new Float64Array(count);
  let seed=20261023;
  if (spec.noise) for(let i=0;i<count;i++) {
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    audio[i]=((seed/4294967296)*2-1)*0.04;
  }
  for(const e of spec.events) {
    const start=Math.round(e.startSeconds*spec.sampleRate);
    const length=Math.round(e.durationSeconds*spec.sampleRate);
    const hz=440*Math.pow(2,(e.midi-69)/12);
    let phase=0;
    for(let j=0;j<length && start+j<count;j++) {
      const t=j/spec.sampleRate;
      const vibrato=spec.vibrato ? Math.pow(2,0.15*Math.sin(2*Math.PI*5*t)/12) : 1;
      phase+=2*Math.PI*hz*vibrato/spec.sampleRate;
      const env=Math.min(1,t/0.02,(e.durationSeconds-t)/0.035);
      audio[start+j]+=0.34*Math.max(0,env)*(Math.sin(phase)+0.18*Math.sin(2*phase)+0.06*Math.sin(3*phase));
    }
  }
  const bytes=count*spec.channels*2;
  const b=Buffer.alloc(44+bytes);
  b.write('RIFF',0);b.writeUInt32LE(36+bytes,4);b.write('WAVE',8);
  b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);
  b.writeUInt16LE(spec.channels,22);b.writeUInt32LE(spec.sampleRate,24);
  b.writeUInt32LE(spec.sampleRate*spec.channels*2,28);b.writeUInt16LE(spec.channels*2,32);
  b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes,40);
  for(let i=0;i<count;i++) for(let c=0;c<spec.channels;c++) {
    const value=audio[i]*(c===0?1:0.8);
    b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,value))*32767),44+(i*spec.channels+c)*2);
  }
  return b;
}
for(const spec of specs) fs.writeFileSync(path.join(out,spec.file),wav(spec));
fs.writeFileSync(path.join(out,'expected-events.json'),JSON.stringify({
  schemaVersion:1,provenance:'Original synthetic test signals generated for Humline; not human humming.',
  onsetEndToleranceSeconds:0.1,fixtures:specs
},null,2)+'\n');
fs.writeFileSync(path.join(out,'example-project.json'),JSON.stringify({
  schemaVersion:1,id:'humline-synthetic-example',title:'Synthetic example melody',bpm:100,
  transcriptionBpm:100,instrument:'keys',
  notes:melody.map((e,i)=>({id:`example-note-${i+1}`,midi:e.midi,startBeat:e.startSeconds*100/60,
    durationBeats:e.durationSeconds*100/60,velocity:0.75,source:'manual'})),
  sourceAudio:{name:'melody-clean.wav',durationSeconds:6.1,synthetic:true}
},null,2)+'\n');
console.log(`Generated ${specs.length} synthetic WAV fixtures and two JSON references.`);
