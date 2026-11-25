import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {parse} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const [directory,relationalDir,output]=process.argv.slice(2);
if(!output)throw Error('Usage: node scripts/import-astra-militarum-loadouts.mjs CSV_DIR MFM_RELATIONAL_DIRECTORY OUTPUT_TS');
const {tables}=await loadExport({directory});
const read=file=>readFileSync(join(relationalDir,'astra-militarum'+file),'utf8');
const records=key=>JSON.parse(read('-'+key+'.json'));
const mfm=parse(read('.yaml'));
if(mfm.slug!=='astra-militarum'||mfm.version!=='1.6')throw Error('Review current Astra Militarum manual');
const units=records('units'),comps=records('unit-compositions');
const items=new Map([...records('weapons'),...records('wargear')].map(i=>[i.id,i]));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const cap=s=>s[0].toUpperCase()+s.slice(1);
const forbidden=new Set(['AIRCRAFT','COMMISSAR','EPIC HERO','MILITARUM TEMPESTUS','OGRYN','RATLING','RATLINGS','TECH-PRIEST ENGINSEER','MINISTORUM PRIEST']);
const expanded=choice=>choice.flatMap(i=>{
 const item=items.get(i.id);
 if(!item||item.game_version.edition!=='11th'||item.game_version.dataslate!==mfm.firstSeen||!Number.isInteger(i.count)||i.count<1)throw Error('Unresolved MFM item '+i.id);
 return Array(i.count).fill(cap(item.name));
});
const remaining=(stock,choice)=>{
 const rest=[...stock];
 for(const item of choice){const index=rest.indexOf(item);if(index<0)return;rest.splice(index,1);}
 return rest;
};
function defaults(slots,stock){
 const solutions=[];
 function visit(n,rest,indices){
  if(n===slots.length){if(!rest.length)solutions.push(indices);return;}
  slots[n].forEach((choice,index)=>{const next=remaining(rest,choice);if(next)visit(n+1,next,[...indices,index]);});
 }
 visit(0,stock,[]);
 if(solutions.length!==1)throw Error('Cannot uniquely recover stock equipment from its printed alternatives: '+JSON.stringify({stock,slots}));
 return solutions[0];
}
function slotLabels(choices) {
 const [base,...others]=choices;
 if(!base.length)return others.length===1?others[0].join(' + '):others[0].length===1?others.map(x=>x.join(' + ')).join(' or '):'Additional weapons';
 if(base.length===1)return base[0]+' alternatives';
 return base.length>3?'Hull and sponson weapons':base.join(' + ')+' alternatives';
}
function compile(profile,layers){
 const model=profile.model;
 const entries=layers.filter(s=>s.model===model);
 if(entries.some(s=>s.picks!==1||s.repeats||s.alternate))throw Error('Unreviewed slot for '+model);
 const groups=entries.map(s=>s.choices.map(expanded));
 const selected=defaults(groups,expanded(profile.items));
 const fixed=[],slots=[];
 groups.forEach((group,index)=>{
  if(group.length===1)fixed.push(...group[0]);
  else{const chosen=group[selected[index]],choices=[chosen,...group.filter((_,i)=>i!==selected[index])];
   slots.push({label:slotLabels(choices),choices});}
 });
 if(new Set(slots.map(s=>s.label)).size!==slots.length)throw Error('Duplicate slot label for '+model);
 return {role:model,fixed,slots};
}
const out=[];
for(const price of mfm.units.filter(p=>!p.legends&&!p.groupTitle)){
 const native=tables.Datasheets.find(s=>s.faction_id==='AM'&&norm(s.name)===norm(price.name));
 if(!native)throw Error('Missing native card '+price.name);
 const tags=tables.Datasheets_keywords.filter(k=>k.datasheet_id===native.id);
 if(tags.some(k=>forbidden.has(k.keyword.toUpperCase())))continue;
 const proxy=tables.Datasheets.find(s=>s.faction_id==='GC'&&s.name===native.name);
 if(!proxy||proxy.loadout!==native.loadout)throw Error('Review Brood Brothers card '+native.name);
 const options=id=>tables.Datasheets_options.filter(o=>o.datasheet_id===id).map(o=>o.description);
 if(JSON.stringify(options(native.id))!==JSON.stringify(options(proxy.id)))throw Error('Review changed GSC equipment '+native.name);
 const record=units.find(u=>norm(u.name)===norm(price.name)&&u.external_refs.some(r=>r.namespace==='mfm'));
 const comp=comps.find(c=>c.unit_id===record?.id);
 if(comp?.game_version.edition!=='11th'||comp.game_version.dataslate!==mfm.firstSeen||comp.loadout.uniform.length)throw Error('Unverified composition '+native.name);
 const kit=comp.loadout,roles=kit.templates.map(t=>compile(t,kit.slots));
 const tiers={};
 for(const t of comp.tiers??[{models:comp.models}]){
  let alternatives=[{}];
  for(const m of t.models){alternatives=alternatives.flatMap(v=>Array.from({length:m.max-m.min+1},(_,i)=>({...v,[m.name]:(v[m.name]??0)+m.min+i})));}
  for(const counts of alternatives){
   const n=Object.values(counts).reduce((a,b)=>a+b,0),perRole={};
   for(const role of roles){const base=role.role.replace(/#\d+$/,'');perRole[role.role]=base===role.role?counts[base]:1;}
   if(roles.length&&Object.values(perRole).reduce((a,b)=>a+b,0)!==n)throw Error('Unresolved roles '+native.name);
   tiers[n]=perRole;
  }
 }
 const limits=kit.limits.map(l=>({role:l.model,thresholds:l.breakpoints,choices:l.choices.map(expanded)}));
 // The current datasheet requires distinct Veteran heavy guns and locks the
 // Krieg medical/radio bearer to a lasgun. The relational choices alone do not.
 if(native.name==='Catachan Command Squad'){
  const guns=['Flamer','Grenade launcher','Heavy flamer','Meltagun','Plasma gun','Sniper rifle'];
  if(!options(native.id).some(s=>s.includes('same weapon from this list more than once')))throw Error('Review Veteran weapon limits');
  limits.push({role:'Veteran Guardsman',thresholds:[{models:0,choices:guns.length,per_choice:1}],choices:guns.map(s=>[s])});
 }
 if(native.name==='Death Korps Of Krieg'){
  const role=roles.find(m=>m.role==='Death Korps Trooper');
  const main=role.slots.find(s=>s.choices[0][0]==='Lasgun');
  if(!main||!options(native.id).some(s=>s.includes('only take one of these options')))throw Error('Review Death Korps specialists');
  role.slots=[{label:'Firearm and equipment',choices:[...main.choices,['Lasgun','Vox-caster'],['Lasgun','Death Korps Medi-pack']]}];
 }
 const weapons=(record.weapon_ids??[]).map(id=>{const weapon=items.get(id);if(!weapon)throw Error('Unknown weapon '+id);return weapon;});
 const ranged=weapons.filter(w=>w.type==='ranged').map(w=>cap(w.name));
 const costs=Object.fromEntries((price.wargear??[]).map(g=>[cap(g.item),g.points]));
 out.push({unit:proxy.name,roles,tiers,limits,ranged:[...new Set(ranged)],costs});
}
if(out.length!==52)throw Error('Review the Brood Brothers whitelist');
out.sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
writeFileSync(output,"// Generated from matched 11e native/allied cards and October MFM v1.6 by scripts/import-astra-militarum-loadouts.mjs.\nimport type {GuardKit} from './astra-militarum-loadouts';\nexport const ASTRA_MILITARUM_KITS:readonly GuardKit[]=[\n"+out.map(r=>' '+JSON.stringify(r)).join(',\n')+"\n];\n");
