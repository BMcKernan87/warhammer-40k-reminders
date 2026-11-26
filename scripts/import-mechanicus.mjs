import {importFactionMuster} from './import-faction-muster.mjs';
import {mechanicusCompositions} from './import-mechanicus-composition.mjs';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {parse,stringify} from 'yaml';
import {loadExport} from './import-wahapedia-11e.mjs';

const args=process.argv.slice(2);
if(!args[4])throw Error('Usage: node scripts/import-mechanicus.mjs CSV_DIR MFM_YAML UNITS_JSON COMPOSITIONS_JSON OUTPUT_TS');
const units=JSON.parse(readFileSync(args[2],'utf8'));
const key=name=>name.toLowerCase().replace(/[^a-z0-9]/g,'');
const {tables}=await loadExport({directory:args[0]});
const manual=parse(readFileSync(args[1],'utf8'));
const enginseer=manual.units.find(u=>u.name==='Tech-Priest Enginseer');
const inherited=['Hastarii Exterminators','Hastarii Fusiliers','Servitor Battleclade'];
// The MFM relational leader list predates these bodyguards. The October pack
// pp. 12–15 grants them inherited permissions. Verify the published conditions
// before reconciling those extra edges; do not treat the old list as a veto.
for(const name of inherited){
 const sheet=tables.Datasheets.find(s=>s.name===name&&s.faction_id==='AdM');
 const rule=tables.Datasheets_abilities.find(a=>a.datasheet_id===sheet?.id&&a.name==='ATTACHED UNIT')?.description;
 const expected=name==='Servitor Battleclade'?'If a Character unit from your army with the Leader ability can be attached to a Kataphron Breachers unit, it can be attached to this unit instead.':'If a Character unit from your army can be attached to a Skitarii Rangers unit, it can be attached to this unit instead';
 if(rule!==expected||!enginseer?.leaderTo?.includes(name==='Servitor Battleclade'?'Kataphron Breachers':'Skitarii Rangers')||enginseer.leaderTo.includes(name))throw Error('Review inherited Enginseer attachment to '+name);
}
enginseer.leaderTo.push(...inherited);
const prepared=mkdtempSync(join(tmpdir(),'mechanicus-muster-'));
const manualPath=join(prepared,'adeptus-mechanicus.yaml');writeFileSync(manualPath,stringify(manual));
try{
await importFactionMuster({
 name:'Adeptus Mechanicus',slug:'adeptus-mechanicus',factionId:'AdM',sourceId:'000000015',total:34,
 pack:'eng_14-10_wh40k_-faction_pack_adeptus-mechanicus-g0jwiuyz3x-f5itnst9j9.pdf',packVersion:'1.4',prefix:'MECHANICUS',
 battleOnlyModels:{'Servitor Battleclade':['Underseer']},
 compositions:mechanicusCompositions,
 extraExport(natives,tables){
  const ability=tables.Abilities.find(a=>a.id==='000008382');
  if(ability?.name!=='Doctrina Imperatives')throw Error('Review Doctrina Imperatives source');
  const authorized=new Set(tables.Datasheets_abilities.filter(a=>a.ability_id===ability.id).map(a=>a.datasheet_id));
  const recipients=natives.filter(s=>authorized.has(s.id)).map(s=>s.name).sort();
  if(recipients.length!==34)throw Error('Review Mechanicus Doctrina recipients');
  return 'export const MECHANICUS_DOCTRINA_UNITS:readonly string[]='+JSON.stringify(recipients)+';\n';
 },
 reconcile(byName){
  for(const [name,sheet] of byName){
   const independent=units.filter(u=>key(u.name)===key(name)&&u.external_refs.some(r=>r.namespace==='mfm'));
   if(independent.length!==1)throw Error('Review independent model profiles for '+name);
   const normalized=values=>values.map(v=>(v==null?'-':String(v)).replace(/["+]/g,'')).join('|');
   const printed=[...new Set(Object.values(sheet.modelProfiles??{model:sheet.profile}).map(p=>normalized([p.move,p.toughness,p.save,p.wounds,p.leadership,p.objectiveControl])))].sort();
   const expected=[...new Set(independent[0].profiles.map(p=>normalized([p.M,p.T,p.Sv,p.W,p.Ld,p.OC])))].sort();
   if(JSON.stringify(printed)!==JSON.stringify(expected))throw Error('Model characteristics disagree for '+name);
  }
  const servitors=byName.get('Servitor Battleclade');
  if(!servitors?.modelKeywords?.Underseer?.includes('TECH-PRIEST')||!servitors.compositionBySize?.[9]?.['Servitor Underseer'])throw Error('Review Underseer keyword scope');
  servitors.modelKeywords['Servitor Underseer']=servitors.modelKeywords.Underseer;delete servitors.modelKeywords.Underseer;
  for(const unit of ['Cybernetica Datasmith','Skitarii Marshal','Technoarcheologist'])if(byName.get(unit)?.attachmentRole!=='support')throw Error('Review October Support role for '+unit);
 },
},[args[0],manualPath,...args.slice(2)]);
writeFileSync(args[4],readFileSync(args[4],'utf8').replace('scripts/import-adeptus-mechanicus.mjs','scripts/import-mechanicus.mjs'));
}finally{rmSync(prepared,{recursive:true,force:true});}
