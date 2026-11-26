const key=value=>value.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const plain=value=>value.replace(/<[^>]*>/g,' ').replace(/&nbsp;/gi,' ').replace(/\s+/g,' ').trim();
const profile=name=>name.trim().split(/\s+[–—-]\s+/)[0];
export function modelKits(tables,manual,{slug,factionId,factionName,modelRole,aliases={}}){
 if(manual.slug!==slug||!manual.version)throw Error('Expected a dated '+factionName+' Field Manual');
 const sources=new Map(tables.Source.map(row=>[row.id,row]));
 const sheets=tables.Datasheets.filter(row=>row.faction_id===factionId&&sources.get(row.source_id)?.name===factionName);
 const legal=new Set(manual.units.filter(row=>!row.legends).map(row=>key(row.name)));
 if(legal.size!==sheets.length||sheets.some(row=>!legal.has(key(row.name))))throw Error(factionName+' inventory differs between the 11e export and MFM');
 return sheets.map(sheet=>{
  if(sources.get(sheet.source_id)?.edition!=='11'||!sheet.link.startsWith('https://wahapedia.ru/wh40k11ed/factions/'+slug+'/'))throw Error('Wrong datasheet edition');
  const own=t=>tables[t].filter(row=>row.datasheet_id===sheet.id);
  const weapons=own('Datasheets_wargear'),wargear=own('Datasheets_abilities').filter(row=>row.type==='Wargear');
  const names=[...weapons.map(w=>profile(w.name)),...wargear.map(r=>r.name.trim())];
  const canonical=new Map(names.map(name=>[key(name),name]));
  const common=[],bearers={};
  for(const row of plain(sheet.loadout).matchAll(/\b(This|Every|The|One(?: other)?) ([^.:*!]+?) is (?:additionally )?equipped with: ([^.]+)\./g)){
   const rawRole=row[2];
   const items=row[3].split(/; |, /).flatMap(value=>{
    const [,n,item]=value.match(/^(?:(\d+) )?(.+)$/);
    const lookup=key(aliases[sheet.name]?.[item]??item);
    const name=canonical.get(lookup)??canonical.get(lookup.replace(/s$/,''));
    if(!name)throw Error(sheet.name+' has unknown standard equipment '+item);
    return Array(Number(n??1)).fill(name);
   });
   const role=modelRole(sheet.name,rawRole,items);
   if(role==='model'){common.push(...items);continue;}
   if(bearers[role])throw Error('Duplicate bearer '+role);
   bearers[role]=items;
  }
  if(!common.length&&!Object.keys(bearers).length)throw Error(sheet.name+' has no parsed equipment');
  const namesFor=type=>[...new Set(weapons.filter(w=>w.type===type).map(w=>profile(w.name)))];
  return {unit:sheet.name,common,bearers,ranged:namesFor('Ranged'),melee:namesFor('Melee')};
 }).sort((a,b)=>a.unit.localeCompare(b.unit,'en'));
}
