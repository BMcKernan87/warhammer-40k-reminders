import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {detachmentBudget} from '../src/edition-2026';
import {custodesDetachmentReminders as sheet,eligibleCustodesUpgrades} from '../src/custodes-detachments';
function army(detachments:string[],...units:string[]){
 const counts:Record<string,number>={};
 return {...newSelection('Adeptus Custodes'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}))};
}
describe('October Custodes army and detachment rules',()=>{
 it.each([
  ['Aquilan Shield','Custodian Guard Sodality','Rapid Reactions','Movement','opponent','normal shooting'],
  ['Auric Champions','Shield-Captain','Duty Unto Death','Fight','either','3+'],
  ['Dread Host','Vertus Praetors','Golden Light Of The Moiraides','Movement','own','ingress move'],
  ['Emissaries Imperatus','Custodian Wardens','Selfless Service','Charge','opponent','modified Charge roll'],
  ['Emperor’s Chosen','Shield-Captain','Superhuman Focus','Command','either','once per battle round'],
  ['Grav-Assault Force','Pallas Grav-Attack','Victory Before Death','Shooting','either','no enemy'],
  ['Guardians of the Throne','Custodian Wardens','Swift As The Eagle','Movement','opponent','8″'],
  ['Honoured Companions','Sentinel Guard Sodality','Avenge The Fallen','Fight','either','non-Character'],
  ['Lions of the Emperor','Allarus Custodians','Fury Of The Emperor','Charge','own','+2'],
  ['Might of the Moritoi','Telemon Heavy Dreadnought','Unstoppable Momentum','Charge','own','Mobile'],
  ['Null Maiden Vigil','Witchseeker Squad','Purgation Sweep','Shooting','own','Torrent'],
  ['Shadowkeepers','Custodian Wardens','Indomitable Guardians','Fight','opponent','next friendly unit'],
  ['Solar Watch','Gyrfalcon Jetbike Sodality','Gravimetric Grenade','Charge','opponent','12″'],
 ])('%s includes an applicable rule in its correct play window',(det,unit,title,phase,turn,text)=>{
  const row=sheet(army([det],unit,'Callidus Assassin')).find(r=>r.title.startsWith(title)&&r.window===phase);
  expect(row).toMatchObject({turn,units:[unit+'#1']});
  expect(row?.summary).toContain(text);
 });
 it.each([
  ['Emissaries Imperatus','Conservai','start an action after Advancing'],
  ['Solar Watch','Calistus','2″ to Move'],
  ['Aquilan Shield','Salvus','6″ range'],
  ['Dread Host','Dacatarai','pile-in and consolidation'],
  ['Shadowkeepers','Kaptaris','Battle-shock at −1'],
  ['Emperor’s Chosen','Rendax','3–5 D3'],
 ])('adds only the selected %s host’s favoured ka’tah benefits',(det,stance,effect)=>{
  const own=sheet(army([det],'Custodian Wardens')).find(r=>r.title===stance+' Ka’tah');
  expect(own?.summary).toContain(effect);
  expect(sheet(army(['Auric Champions'],'Custodian Wardens')).find(r=>r.title===stance+' Ka’tah')?.summary).not.toContain(effect);
 });
 it('treats Sisters as Anathema and limits the aura to actual Custodes recipients',()=>{
  const a=army(['Null Maiden Vigil','Dread Host'],'Knight-Centura','Witchseeker Squad','Custodian Guard Sodality');
  const rows=sheet(a);
  expect(rows.find(r=>r.title==='Martial Ka’tah · ready units')?.units).toEqual(['Custodian Guard Sodality#1']);
  expect(rows.find(r=>r.title==='Aegis of the Emperor')?.units).toEqual(['Custodian Guard Sodality#1']);
  expect(rows.find(r=>r.title==='Daughters of the Abyss')?.units).toEqual(['Knight-Centura#1','Witchseeker Squad#1']);
  expect(rows.find(r=>r.title==='Psychic Null (Aura)')?.units).toEqual(['Custodian Guard Sodality#1']);
  expect(rows.find(r=>r.title==='Creeping Dread (Aura)')).toMatchObject({window:'Command',turn:'opponent'});
  expect(rows.some(r=>r.title==='Aquila Commander')).toBe(false);
 });
 it('prints the extra CP only for the designated Aquila Warlord and at round start',()=>{
  const a=army(['Auric Champions'],'Shield-Captain','Blade Champion');
  expect(sheet({...a,warlordId:'Blade Champion#1'}).some(r=>r.title==='Aquila Commander')).toBe(false);
  expect(sheet({...a,warlordId:'Shield-Captain#1'}).find(r=>r.title==='Aquila Commander')).toMatchObject({window:'Start of battle round',timing:'start',units:['Shield-Captain#1']});
 });
 it('only offers Gilded Champion to Characters that used a once-per-battle per-unit ability, in that ability’s phase',()=>{
  const a=army(['Auric Champions'],'Shield-Captain','Shield-Captain in Allarus Terminator Armour','Shield-Captain on Dawneagle Jetbike','Blade Champion','Trajann Valoris');
  const rows=sheet(a).filter(r=>r.title.startsWith('Gilded Champion'));
  expect(rows.map(r=>[r.window,r.turn,r.units])).toEqual([
   ['Shooting','opponent',['Shield-Captain#1']],['Movement','own',['Shield-Captain in Allarus Terminator Armour#1']],['Fight','either',['Shield-Captain on Dawneagle Jetbike#1']]
  ]);
 });
 it('distinguishes one-per-army vehicle upgrades from ordinary repeatable upgrades and Character Enhancements',()=>{
  const a=army(['Might of the Moritoi','Grav-Assault Force','Aquilan Shield'],'Telemon Heavy Dreadnought','Coronus Grav-Carrier','Shield-Captain');
  expect(eligibleCustodesUpgrades(a,'Telemon Heavy Dreadnought')).toEqual(expect.arrayContaining([expect.objectContaining({name:'Augury Uplink (one per army)',points:30,isUpgrade:true,repeatable:false})]));
  expect(eligibleCustodesUpgrades(a,'Coronus Grav-Carrier')).toEqual(expect.arrayContaining([expect.objectContaining({name:'Combat Deployment',points:20,isUpgrade:true,repeatable:true})]));
  expect(eligibleCustodesUpgrades(a,'Shield-Captain')).toEqual(expect.arrayContaining([expect.objectContaining({name:'Not a Shell Wasted',points:10,isUpgrade:false,repeatable:false})]));
  expect(sheet({...a,upgrades2026:{'Telemon Heavy Dreadnought#1':'Augury Uplink (one per army)'}}).find(r=>r.title.includes('Augury Uplink'))).toMatchObject({units:['Telemon Heavy Dreadnought#1']});
 });
 it('distinguishes readied units from vehicles that only gain a stance after Superhuman Focus, and honours aircraft move limits',()=>{
  const a=army(['Emperor’s Chosen'],'Pallas Grav-Attack','Ares Gunship','Custodian Guard Sodality');
  const rows=sheet(a);
  expect(rows.find(r=>r.title==='Martial Ka’tah · ready units')?.units).toEqual(['Custodian Guard Sodality#1']);
  expect(rows.find(r=>r.title.startsWith('Superhuman Focus'))?.units).toContain('Pallas Grav-Attack#1');
  expect(rows.find(r=>r.title==='Salvus Ka’tah')?.units).toContain('Ares Gunship#1');
  expect(rows.find(r=>r.title==='Calistus Ka’tah')?.units).not.toContain('Ares Gunship#1');
  const blade=sheet(army(['Dread Host'],'Blade Champion'));
  expect(blade.some(r=>r.title==='Salvus Ka’tah')).toBe(false);
 });
 it('only grants Combat Deployment to fitting Custodes Infantry, excluding jump packs and Sisters',()=>{
  const a=army(['Grav-Assault Force'],'Coronus Grav-Carrier','Venatari with Verutum Lances','Aquilon Terminators with Solarite Power Talons','Vigilator Squad','Custodian Guard Sodality','Blade Champion');
  const configured={...a,instances:a.instances.map(s=>s.unit==='Custodian Guard Sodality'?{...s,models:3}:s),upgrades2026:{'Coronus Grav-Carrier#1':'Combat Deployment'}};
  expect(sheet(configured).find(r=>r.title.includes('Combat Deployment'))?.units).toEqual(['Aquilon Terminators with Solarite Power Talons#1','Custodian Guard Sodality#1','Blade Champion#1']);
 });
 it('restricts ranged bonuses to a real weapon including the optional relic orb',()=>{
  const sister=army(['Null Maiden Vigil'],'Knight-Centura');
  const melee={...sister,upgrades2026:{'Knight-Centura#1':'Oblivion Knight'}};
  expect(sheet(melee).filter(r=>r.title.includes('Oblivion Knight')).map(r=>r.window)).toEqual(['Fight']);
  const armed={...melee,instances:melee.instances.map(s=>({...s,knightGear:{Weapons:'Master-crafted Flamer + Gun Stock'}}))};
  expect(sheet(armed).filter(r=>r.title.includes('Oblivion Knight')).map(r=>r.window)).toEqual(['Shooting','Fight']);
  const blade=army(['Emissaries Imperatus'],'Blade Champion');
  expect(sheet({...blade,upgrades2026:{'Blade Champion#1':'Auriferous Orb'}}).find(r=>r.title==='Salvus Ka’tah')?.units).toEqual(['Blade Champion#1']);
 });
 it('enforces host exclusivity without preventing mixed legal detachments',()=>{
  expect(detachmentBudget('Adeptus Custodes',['Aquilan Shield','Shadowkeepers'],'Incursion').valid).toBe(false);
  expect(detachmentBudget('Adeptus Custodes',['Aquilan Shield','Null Maiden Vigil'],'Incursion')).toMatchObject({valid:true,spent:2,dispositions:['Take and Hold','Disruption']});
  expect(detachmentBudget('Adeptus Custodes',['Guardians of the Throne'],'Strike Force')).toMatchObject({valid:true,spent:3,dispositions:['Priority Assets','Purge the Foe']});
 });
});
