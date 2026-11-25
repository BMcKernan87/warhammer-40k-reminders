import {importFactionMuster} from './import-faction-muster.mjs';

await importFactionMuster({
 name:'Thousand Sons',slug:'thousand-sons',factionId:'TS',sourceId:'000000027',
 daemons:'Scintillating Legions',total:34,daemonCount:6,pack:'eng_30-09_wh40k_faction_pack_thousand_sons-4lioijwxdj-otjrinzt8c.pdf',
 battleOnlyModels:{'Pink Horrors':['Blue Horrors','Brimstone Horrors'],'Blue Horrors':['Brimstone Horrors']},prefix:'THOUSAND_SONS',
 armyRuleExport(natives,tables){
  const cabal=tables.Abilities.find(r=>r.faction_id==='TS'&&r.name==='Cabal of Sorcerers');
  if(!cabal||!cabal.description.includes('Channel the Warp'))throw Error('Review current Cabal rule');
  const casters={};
  for(const card of natives){
   const printed=tables.Datasheets_abilities.find(a=>a.datasheet_id===card.id&&a.ability_id===cabal.id);
   if(!printed)continue;
   const restricted=printed.name.match(/Cabal of Sorcerers \((.+) only\)/i)?.[1];
   const model=restricted?tables.Datasheets_models.find(m=>m.datasheet_id===card.id&&m.name.toLowerCase()===restricted.toLowerCase()):undefined;
   if(restricted&&!model||printed.name&&!restricted)throw Error('Unrecognized Cabal bearer for '+card.name);
   casters[card.name]=model?.name??card.name;
  }
  if(Object.keys(casters).length!==12)throw Error('Review native Ritual caster inventory');
  return 'export const RITUAL_BEARERS:Readonly<Record<string,string>>='+JSON.stringify(casters,null,1)+';\n';
 },
 reconcile(byName){
  for(const [unit,toughness] of Object.entries({'Scarab Occult Terminators':6,'Sorcerer In Terminator Armour':6,Ahriman:5,'Exalted Sorcerer':5,'Exalted Sorcerer on Disc of Tzeentch':5,'Infernal Master':5,'Rubric Marines':5,Sorcerer:5})){
   const s=byName.get(unit),profiles=s?.profile?[s.profile]:Object.values(s?.modelProfiles??{});
   if(!profiles.length||profiles.some(p=>p.toughness!==toughness))throw Error('Reconcile September Toughness on '+unit);
  }
  const drake=byName.get('Heldrake'),p=drake.profile;
  if(!p||p.move!=='12"'||p.objectiveControl!==0||drake.keywords.includes('AIRCRAFT')||byName.get('Flamers').profile.leadership!=='7+'||
   byName.get('Chaos Vindicator').profile.move!=='9"'||['Chaos Rhino','Chaos Land Raider','Chaos Predator Annihilator','Chaos Predator Destructor','Chaos Vindicator'].some(unit=>!byName.get(unit).keywords.includes('FRAME')))throw Error('Reconcile September profile changes');
 },
},process.argv.slice(2));
