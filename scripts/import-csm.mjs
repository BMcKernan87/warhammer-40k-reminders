import {readFileSync,writeFileSync} from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import {parse} from 'yaml';
import {loadExport,modelProfile} from './import-wahapedia-11e.mjs';
import {importNativeMuster,nativeNameKey} from './import-native-muster.mjs';
import {applyModelComposition} from './import-mfm-composition.mjs';

const [directory,manualPath,unitsPath,compositionPath,destination]=process.argv.slice(2);
if(!destination)throw Error('Usage: node scripts/import-csm.mjs CSV_DIR MFM_YAML UNITS_JSON COMPOSITIONS_JSON OUTPUT_TS');
const {tables}=await loadExport({directory});
const manual=parse(readFileSync(manualPath,'utf8'));
const units=JSON.parse(readFileSync(unitsPath,'utf8')),compositions=JSON.parse(readFileSync(compositionPath,'utf8'));
if(manual.slug!=='chaos-space-marines'||manual.version!=='1.6'||manual.firstSeen!=='2026-10-14')throw Error('Review CSM MFM revision');
const source=tables.Source.find(s=>s.id==='000000012'&&s.name==='Chaos Space Marines'&&s.edition==='11'&&s.version==='1.2');
if(!source)throw Error('Review CSM native source revision');
// The four Cult of the Dark Gods datasheets are separate allied cards. They
// use their own faction manuals and must not enter the native MFM inventory.
const native=tables.Datasheets.filter(d=>d.faction_id==='CSM'&&d.source_id===source.id);
const sheets=importNativeMuster({...tables,Datasheets:native},manual,{name:'Chaos Space Marines',slug:'chaos-space-marines',factionId:'CSM',packAircraftOrModels:[]});
if(sheets.length!==54)throw Error('Review native CSM inventory');
const matched=sheet=>{
 const found=units.filter(u=>nativeNameKey(u.name)===nativeNameKey(sheet.unit)&&!u.is_legend&&u.game_version.edition==='11th'&&u.game_version.dataslate===manual.firstSeen&&u.external_refs.some(r=>r.namespace==='mfm'));
 if(found.length!==1)throw Error('Missing independent CSM card '+sheet.unit);
 return found[0];
};
applyModelComposition(sheets.filter(s=>s.unit!=='Accursed Cultists'),units,compositions,'chaos-space-marines',manual.firstSeen);
const cultists=sheets.find(s=>s.unit==='Accursed Cultists'),composition=compositions.find(c=>c.unit_id===matched(cultists).id);
if(JSON.stringify(cultists.composition)!==JSON.stringify([{model:'Torments',min:3,max:6},{model:'Mutants',min:5,max:10}])||composition.game_version.dataslate!==manual.firstSeen)throw Error('Review variable Accursed Cultist composition');
const alternatives={};
for(const tier of composition.tiers)for(let torments=tier.models.find(m=>m.name==='Torment').min;torments<=tier.models.find(m=>m.name==='Torment').max;torments++)for(let mutants=tier.models.find(m=>m.name==='Mutant').min;mutants<=tier.models.find(m=>m.name==='Mutant').max;mutants++){
 const option={Torment:torments,Mutant:mutants},size=torments+mutants;
 if(!alternatives[size])alternatives[size]=[];
 if(!alternatives[size].some(c=>isDeepStrictEqual(c,option)))alternatives[size].push(option);
}
if(Object.values(alternatives).flat().length!==24||Object.keys(alternatives).join(',')!=='8,9,10,11,12,13,14,15,16')throw Error('Review Accursed Cultist alternatives');
for(const choices of Object.values(alternatives))choices.sort((a,b)=>a.Torment-b.Torment);
// Default mixes are sufficient for the size registry; the actual selected
// mix is resolved by csmModelLoadouts through its direct Composition choice.
cultists.compositionBySize=Object.fromEntries(Object.entries(alternatives).map(([size,choices])=>[size,choices[0]]));
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const stats=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
for(const sheet of sheets){
 const independent=matched(sheet),comp=compositions.find(c=>c.unit_id===independent.id);
 const original=native.find(s=>s.name===sheet.unit),profiles=tables.Datasheets_models.filter(m=>m.datasheet_id===original.id);
 const roles=[...new Set(Object.values(sheet.compositionBySize).flatMap(t=>Object.keys(t)))];
 for(const tier of Object.values(sheet.compositionBySize))for(const role of roles)tier[role]??=0;
 const expanded={};
 for(const role of roles){
  const printed=profiles.length===1?profiles[0]:profiles.find(p=>p.name.split(',').some(n=>key(n)===key(role)))??(sheet.unit==='Dark Commune'&&['Mindwitch','Iconarch','Blessed Blade'].includes(role)?profiles.find(p=>p.name==='OTHER MODELS'):undefined);
  const model=comp.models.find(m=>m.name===role),reference=independent.profiles.find(p=>key(p.name)===key(model?.profile_name??role));
  const fallback=independent.profiles.length===1?independent.profiles[0]:undefined;
  if(!printed||!model||!(reference??fallback))throw Error('Unresolved physical CSM profile '+sheet.unit+' / '+role);
  const expected=reference??fallback,p=modelProfile(printed,sheet.unit);
  if(stats([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])!==stats([expected.M,expected.T,expected.Sv,expected.W,expected.Ld,expected.OC]))throw Error('CSM characteristics disagree '+sheet.unit+' / '+role);
  expanded[role]=p;
 }
 if(profiles.length>1){delete sheet.profile;sheet.modelProfiles=expanded;}
}
const ability=tables.Abilities.find(a=>a.id==='000008359'&&a.name==='Dark Pacts'&&a.faction_id==='CSM');
if(!ability)throw Error('Review Dark Pacts source');
const permissions=tables.Datasheets_abilities.filter(a=>a.ability_id===ability.id&&native.some(s=>s.id===a.datasheet_id));
if(permissions.length!==54||permissions.some(a=>a.model||a.name||a.parameter))throw Error('Review native Dark Pacts scope');
const revision={pack:source.errata_link,packVersion:source.version,manual:manual.version,exportUpdated:tables.Last_update[0].last_update,composition:'https://github.com/wn-mitch/40kdc-data/tree/fd1035a4e2ac7330835010e660bdd7216bfa3fd9/data/core/chaos-space-marines'};
writeFileSync(destination,"// Generated by scripts/import-csm.mjs.\nimport type {Datasheet2026} from './datasheets-2026';\n"+
 'export const CSM_REVISION='+JSON.stringify(revision)+' as const;\n'+
 'export const CSM_SHEETS:readonly Datasheet2026[]='+JSON.stringify(sheets,null,2)+';\n'+
 'export const CSM_DARK_PACT_UNITS:readonly string[]='+JSON.stringify(native.map(s=>s.name).sort())+';\n'+
 'export const CSM_ACCURSED_COMPOSITIONS:Readonly<Record<number,readonly {Torment:number;Mutant:number}[]>>='+JSON.stringify(alternatives)+';\n');
