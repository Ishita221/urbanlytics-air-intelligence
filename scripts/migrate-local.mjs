import { readFileSync,writeFileSync,readdirSync,existsSync,mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
mkdirSync('.sites-runtime',{recursive:true});
const ledger='.sites-runtime/local-migrations.json';
const applied=existsSync(ledger)?JSON.parse(readFileSync(ledger,'utf8')):[];
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
 if(applied.includes(file))continue;
 const r=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file','drizzle/'+file],{stdio:'inherit'});
 if(r.status!==0)process.exit(r.status??1);
 applied.push(file);writeFileSync(ledger,JSON.stringify(applied));
}
console.log('Local migrations are up to date.');
