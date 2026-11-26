import {importFactionMuster} from './import-faction-muster.mjs';

const ancients={
 'brotherhood-terminator-squad':['Ancient','Terminator'],
 'paladin-squad':['Paladin Ancient','Paladin'],
};

await importFactionMuster({
 name:'Grey Knights',slug:'grey-knights',factionId:'GK',sourceId:'000000013',packAircraftOrModels:['Grey Knights Thunderhawk Gunship'],total:26,
 pack:'eng_30-09_wh40k_faction_pack_grey_knights-jnrahwb1qf-ubjtmdlivm.pdf',packVersion:'1.2',prefix:'GREY_KNIGHTS',
 compositions(rows){
  // Ancient is an optional bearer of the squad banner, rather than a separate
  // compulsory profile. Fold it into its parent role and expose the banner
  // and its extra weapon route on the chosen Terminator or Paladin instead.
  return rows.map(c=>{
   const roles=ancients[c.unit_id];
   if(!roles)return c;
   const [ancient,ordinary]=roles,tiers=[];
   for(const tier of c.tiers){
    const banner=tier.models.find(m=>m.name===ancient);
    if(banner&&(banner.min!==1||banner.max!==1))throw Error('Review Ancient in '+c.unit_id);
    const models=tier.models.filter(m=>m.name!==ancient).map(m=>m.name===ordinary&&banner?{...m,min:m.min+1,max:m.max+1}:m);
    if(!tiers.some(t=>JSON.stringify(t.models.map(m=>[m.name,m.min,m.max]))===JSON.stringify(models.map(m=>[m.name,m.min,m.max]))))tiers.push({models});
   }
   return {...c,tiers};
  });
 },
 extraExport(natives,tables){
  const ability=tables.Abilities.find(a=>a.id==='000010345');
  if(ability?.name!=='Gate of Infinity')throw Error('Review Gate of Infinity source');
  const authorized=new Set(tables.Datasheets_abilities.filter(a=>a.ability_id===ability.id).map(a=>a.datasheet_id));
  const gate=natives.filter(s=>authorized.has(s.id)).map(s=>s.name).sort();
  if(gate.length!==17)throw Error('Review Grey Knights Gate of Infinity recipients');
  return 'export const GREY_KNIGHTS_GATE_UNITS:readonly string[]='+JSON.stringify(gate)+';\n';
 },
 reconcile(byName){
  const toughness={6:['Brother-captain','Brotherhood Chaplain','Brotherhood Librarian','Brotherhood Terminator Squad','Grand Master','Grand Master Voldus','Paladin Squad'],
   5:['Brotherhood Champion','Brotherhood Techmarine','Castellan Crowe','Interceptor Squad','Purgation Squad','Purifier Squad','Strike Squad'],
   9:['Grand Master In Nemesis Dreadknight','Nemesis Dreadknight']};
  for(const [t,units] of Object.entries(toughness))for(const unit of units){
   if(byName.get(unit)?.profile?.toughness!==Number(t))throw Error('Review September Toughness for '+unit);
  }
  const frames=['Land Raider','Land Raider Crusader','Land Raider Redeemer','Razorback','Rhino'];
  if(frames.some(u=>!byName.get(u)?.keywords.includes('FRAME')))throw Error('Review Grey Knights September Frame keywords');
 },
},process.argv.slice(2));
