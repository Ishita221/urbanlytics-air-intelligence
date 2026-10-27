import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
async function load(file){const result=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});return import('data:text/javascript;base64,'+Buffer.from(result.outputText).toString('base64'));}
const {simulate,aqiCategory}=await load('../lib/domain.ts');
const {trainForecast}=await load('../lib/model.ts');
const {browserOwner}=await load('../lib/session.ts');
const {airAnalytics}=await load('../lib/analytics.ts');
test('simulation respects mass balance, zero cuts and full cuts',()=>{
 assert.equal(simulate(120,[40,30,20],[0,0,0]).projected,120);
 assert.ok(Math.abs(simulate(120,[40,30,20],[100,100,100]).projected-12)<1e-9);
 assert.equal(simulate(100,[40,30,0],[50,0,0]).projected,80);
 assert.equal(simulate(100,[0,0,0],[100,100,100]).projected,100);
});
test('invalid source assumptions cannot produce a result',()=>{
 for(const shares of [[50,50,1],[-1,0,0],[NaN,0,0],[0,0]])assert.throws(()=>simulate(100,shares,[10,10,10]));
 assert.throws(()=>simulate(-1,[0,0,0],[0,0,0]));
 assert.throws(()=>simulate(100,[0,0,0],[101,0,0]));
});
test('AQI boundaries and missing values are explicit',()=>{
 assert.equal(aqiCategory(null).label,'Unavailable');assert.equal(aqiCategory(50).label,'Good');assert.equal(aqiCategory(100).label,'Moderate');assert.equal(aqiCategory(151).label,'Unhealthy');assert.equal(aqiCategory(301).label,'Hazardous');
});
function history(){return Array.from({length:240},(_,i)=>({time:1700000000+i*3600,pm2_5:30+10*Math.sin(i/24*Math.PI*2)+i*.05,pm10:50,us_aqi:70,nitrogen_dioxide:12,ozone:20,sulphur_dioxide:3,carbon_monoxide:100,temperature_2m:25,wind_speed_10m:10,relative_humidity_2m:50}));}
test('future target values never leak into training or recursive inference',()=>{
 const rows=history(),validAt=rows[175].time;
 const model=trainForecast(rows,validAt),changed=rows.map((r,i)=>({...r,pm2_5:i>175?1900:r.pm2_5}));
 assert.deepEqual(trainForecast(changed,validAt),model);assert.equal(model.points.length,48);assert.ok(model.mae>=0);assert.ok(model.points.every(p=>Number.isFinite(p.pm2_5)&&p.pm2_5>=0));
});
test('missing history does not generate invented predictions',()=>{const r=history().map(h=>({...h,pm2_5:null}));const result=trainForecast(r,r[175].time);assert.equal(result.points.length,0);assert.equal(result.mae,null);});
test('browser capability is random, HttpOnly, host-only and stable per cookie',async()=>{
 const a=await browserOwner(new Request('https://example.test/api/scenarios'));
 const b=await browserOwner(new Request('https://example.test/api/scenarios'));
 assert.notEqual(a.id,b.id);assert.match(a.cookie,/__Host-urban_session=[a-f0-9]{64};/);assert.match(a.cookie,/HttpOnly; SameSite=Lax; Secure/);assert.ok(!a.cookie.includes('Domain='));
 const again=await browserOwner(new Request('https://example.test/api/scenarios',{headers:{cookie:a.cookie.split(';')[0]}}));assert.equal(again.id,a.id);assert.equal(again.cookie,null);assert.ok(!a.cookie.includes(a.id));
});
test('recursive validation selects a baseline honestly and limits empirical envelopes',()=>{
 const rows=Array.from({length:420},(_,i)=>({...history()[i%240],time:1700000000+i*3600,pm2_5:50}));
 const m=trainForecast(rows,rows[359].time);assert.equal(m.validation.length,3);assert.ok(m.validation.every(v=>v.folds>=5&&v.selectedMae>=0));assert.ok(['ridge','persistence','seasonal'].includes(m.selected));assert.ok(m.points.slice(24).every(p=>p.lower===null&&p.upper===null));assert.ok(m.points.slice(0,24).every(p=>p.lower<=p.pm2_5&&p.upper>=p.pm2_5));
});
test('quality separates missing fields from timeline gaps and preserves missing changes',()=>{
 const rows=history();rows[175]={...rows[175],pm2_5:null};rows[170]={...rows[170],time:rows[170].time+10};const a=airAnalytics({hours:rows,current:rows[175],validAt:rows[175].time},75);assert.ok(a.missing>0);assert.ok(a.gaps>0);assert.equal(a.zScore,null);assert.ok(a.exceedanceHours===0);
});
