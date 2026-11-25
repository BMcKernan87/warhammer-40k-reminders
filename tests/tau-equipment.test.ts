// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {TAU_SHEETS,TAU_REVISION,TAU_GREATER_GOOD_UNITS} from '../src/tau-data.generated';
import {TAU_CARDS} from '../src/tau-card-profiles.generated';
import {TAU_KITS} from '../src/tau-loadouts.generated';
import {tauKeywords,tauMusterUnits} from '../src/tau-data';
import {tauLoadout,tauModelLoadouts,tauWeaponCount,tauHasRangedWeapon,validTauGear,resizeTauGear} from '../src/tau-loadouts';

const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
const count=tauWeaponCount;
function equip(s:RosterInstance,prefix:string,items:string[]){
 const kit=tauLoadout(s.unit,s.models)!;
 const field=kit.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('No legal equipment choice: '+s.unit+' / '+prefix+' / '+items.join(', '));
 const choice=field.choices.find(c=>key(c.items)===key(items))!;
 const gear={...s.knightGear,[field.name]:choice.name};
 if(!validTauGear(s.unit,gear,s.models))throw Error('Equipment limit exceeded');
 return {...s,knightGear:gear};
}
const cost=(s:RosterInstance)=>Object.entries(TAU_SHEETS.find(row=>row.unit===s.unit)!.wargearPoints??{}).reduce((total,[item,points])=>total+count(s,item)*points,0);

it.each(TAU_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s resolves all actual models with unique legal equipment fields at every strength',(unit,sheet)=>{
 for(const [total,roles] of Object.entries(sheet.compositionBySize!)){
  const s=squad(unit,+total),kit=tauLoadout(unit,+total)!,models=tauModelLoadouts(s);
  expect(models).toHaveLength(+total);
  expect(models.reduce<Record<string,number>>((out,m)=>({...out,[m.model]:(out[m.model]??0)+1}),{})).toEqual(Object.fromEntries(Object.entries(roles).filter(([,n])=>n)));
  expect(new Set(kit.slots.map(s=>s.name)).size).toBe(kit.slots.length);
  expect(validTauGear(unit,{},+total)).toBe(true);
  for(const field of kit.slots)for(const choice of field.choices){
   const changed={...s,knightGear:{[field.name]:choice.name}};
   // Vespid specialist choices are legal only at ten models. The selector
   // uses the shared per-strength limits to reject them at smaller sizes.
   if(!validTauGear(unit,changed.knightGear,+total)){expect(unit).toBe('Vespid Stingwings');expect(+total).toBeLessThan(10);continue;}
   const expected=models.flatMap(m=>m.items);
   for(const item of field.choices[0].items){const i=expected.indexOf(item);expect(i).toBeGreaterThanOrEqual(0);expected.splice(i,1);}
   expect(tauModelLoadouts(changed).flatMap(m=>m.items).sort()).toEqual([...expected,...choice.items].sort());
  }
 }
});

it('reconciles the complete native inventory, current source versions and genuine army-rule recipients',()=>{
 const names=TAU_SHEETS.map(s=>s.unit),army=newSelection('T’au Empire');
 expect(names).toHaveLength(43);expect(new Set(names).size).toBe(43);
 expect(new Set(Object.keys(TAU_CARDS))).toEqual(new Set(names));
 expect(new Set(TAU_KITS.map(k=>k.unit))).toEqual(new Set(names));
 expect(tauMusterUnits(army)).toEqual(names);expect(TAU_GREATER_GOOD_UNITS).toHaveLength(30);
 for(const name of ['Crisis Battlesuits','Aun’shi','Aun’va','Longstrike','Tactical Drones','Remora Stealth Drones'])expect(names).not.toContain(name);
 for(const name of ['Manta','Ta’unar Supremacy Armour','AX-1-0 Tiger Shark','Tiger Shark'])expect(names).toContain(name);
 for(const name of ['Vespid Stingwings','Kroot Carnivores','Tidewall Shieldline'])expect(TAU_GREATER_GOOD_UNITS).not.toContain(name);
 expect(TAU_REVISION).toMatchObject({packVersion:'1.2',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
 expect(TAU_SHEETS.every(s=>!s.bodyguards||s.attachmentRole==='leader')).toBe(true);
});

it('keeps drone tokens and their guns on the physical bearer without increasing model count',()=>{
 let e=squad('Ethereal');expect(tauHasRangedWeapon(e)).toBe(false);
 e=equip(e,'',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']);
 expect(tauModelLoadouts(e)).toHaveLength(1);expect(count(e,'Gun drone')).toBe(2);expect(count(e,'Twin pulse carbine')).toBe(2);expect(tauHasRangedWeapon(e)).toBe(true);
 expect(TAU_CARDS.Ethereal.weapons.find(w=>w.name==='Twin pulse carbine')).toMatchObject({range:'20',attacks:'2',skill:'5',strength:5,ap:0,damage:'1',abilities:['assault','twin-linked']});
 const fireblade=equip(squad('Cadre Fireblade'),'',['Gun drone','Shield Drone','Twin pulse carbine']);
 expect(tauModelLoadouts(fireblade)[0].items).toEqual(expect.arrayContaining(['Fireblade pulse rifle','Gun drone','Shield Drone','Twin pulse carbine']));
 const a=newSelection('T’au Empire');expect(tauKeywords(a,e)).not.toContain('FLY');
 expect(count(equip(e,'',['Hover Drone']),'Hover Drone')).toBe(1);
});

it('limits Guardian and Stealth drones individually and the homing beacon to one actual Shas’ui',()=>{
 let team=equip(squad('Breacher Team',10),'Breacher Fire Warrior Shas’ui ·',['Guardian Drone','Gun drone','Twin pulse carbine']);
 expect(tauModelLoadouts(team)).toHaveLength(10);expect(count(team,'Guardian Drone')).toBe(1);
 expect(()=>equip(team,'Breacher Fire Warrior Shas’ui ·',['Guardian Drone','Guardian Drone'])).toThrow();
 expect(()=>equip(team,'Breacher Fire Warrior 1 ·',['Guardian Drone'])).toThrow();
 let stealth=equip(squad('Stealth Battlesuits',5),'Stealth Shas’vre ·',['Gun drone','Marker drone','Twin pulse carbine']);
 expect(()=>equip(stealth,'Stealth Shas’vre ·',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine'])).toThrow();
 stealth=equip(stealth,'Stealth Shas’ui 1 ·',['Homing beacon']);
 expect(()=>equip(stealth,'Stealth Shas’ui 2 ·',['Homing beacon'])).toThrow();
 stealth=equip(stealth,'Stealth Shas’vre ·',['Fusion blaster']);stealth=equip(stealth,'Stealth Shas’ui 1 ·',['Fusion blaster']);
 expect(()=>equip(stealth,'Stealth Shas’ui 2 ·',['Fusion blaster'])).toThrow();
 expect(count(stealth,'Fusion blaster')).toBe(2);expect(count(stealth,'Burst cannon')).toBe(3);
});

it.each(['Commander In Coldstar Battlesuit','Commander In Enforcer Battlesuit'])('%s enforces four hardpoints and unique starred equipment across them',unit=>{
 let s=equip(squad(unit),'Primary weapon or system',['Fusion blaster']);
 for(let n=1;n<=3;n++)s=equip(s,'Additional weapon or system '+n,['Fusion blaster']);
 expect(count(s,'Fusion blaster')).toBe(4);expect(tauModelLoadouts(s)).toHaveLength(1);
 s=equip(s,'Primary weapon or system',['Cyclic ion blaster']);
 expect(()=>equip(s,'Additional weapon or system 1',['Cyclic ion blaster'])).toThrow();
 s=equip(s,'Additional weapon or system 1',['Shield generator']);
 expect(()=>equip(s,'Additional weapon or system 2',['Shield generator'])).toThrow();
 expect(TAU_CARDS[unit].save).toBeNull();
 expect(validTauGear(unit,{'Additional weapon or system 4':'Fusion blaster'})).toBe(false);
 expect(validTauGear(unit,{'Primary weapon or system':'Meltagun'})).toBe(false);
});

it('keeps Crisis weapon pairs and nonduplicate drones independently legal for every battlesuit',()=>{
 let fireknife=squad('Crisis Fireknife Battlesuits',3);
 fireknife=equip(fireknife,'Crisis Fireknife Shas’ui 1 ·',['Missile pod','Missile pod']);
 fireknife=equip(fireknife,'Crisis Fireknife Shas’ui 2 ·',['Plasma rifle','Plasma rifle']);
 fireknife=equip(fireknife,'Crisis Fireknife Shas’vre ·',['Gun drone','Shield Drone','Twin pulse carbine']);
 expect(count(fireknife,'Missile pod')).toBe(3);expect(count(fireknife,'Plasma rifle')).toBe(3);expect(cost(fireknife)).toBe(15);
 expect(()=>equip(fireknife,'Crisis Fireknife Shas’ui 1 ·',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine'])).toThrow();
 let starscythe=squad('Crisis Starscythe Battlesuits',3);
 for(const prefix of ['Crisis Starscythe Shas’ui 1 ·','Crisis Starscythe Shas’ui 2 ·','Crisis Starscythe Shas’vre ·'])starscythe=equip(starscythe,prefix,['T’au flamer','T’au flamer']);
 expect(count(starscythe,'T’au flamer')).toBe(6);expect(cost(starscythe)).toBe(30);
 expect(count(squad('Crisis Sunforge Battlesuits',3),'Fusion blaster')).toBe(6);
});

it('keeps Broadside optional systems mutually exclusive and paid guns and drones on the selected models',()=>{
 let s=equip(squad('Broadside Battlesuits',3),'Broadside Shas’ui 1 ·',['High-yield missile pods']);
 s=equip(s,'Broadside Shas’vre ·',['High-yield missile pods']);
 s=equip(s,'Broadside Shas’ui 2 ·',['Twin plasma rifle','Weapon support system']);
 s=equip(s,'Broadside Shas’ui 2 ·',['Missile Drone','Missile Drone','Missile pod','Missile pod']);
 expect(cost(s)).toBe(10);expect(count(s,'Heavy rail rifle')).toBe(1);expect(count(s,'Missile pod')).toBe(2);
 expect(()=>equip(s,'Broadside Shas’ui 2 ·',['Twin plasma rifle','Twin smart missile system'])).toThrow();
 expect(()=>equip(s,'Broadside Shas’ui 2 ·',['Seeker missile','Twin plasma rifle','Weapon support system'])).toThrow();
 expect(TAU_CARDS[s.unit].weapons.find(w=>w.name==='Missile pod')).toMatchObject({skill:'5',range:'30',strength:7});
 const reduced={...s,models:1,knightGear:resizeTauGear(s,1)};
 expect(tauModelLoadouts(reduced)).toHaveLength(1);expect(count(reduced,'High-yield missile pods')).toBe(1);expect(count(reduced,'Missile Drone')).toBe(0);
});

it('permits Vespid specialist equipment only at ten models and removes it when the squad is resized',()=>{
 let s=squad('Vespid Stingwings',10);
 for(const [n,item] of [[1,'T’au flamer'],[2,'Neutron grenade launcher'],[3,'Neutron rail rifle']] as const)s=equip(s,'Vespid Stingwing '+n+' ·',[item]);
 s=equip(s,'Vespid Strain Leader ·',['Oversight Drone']);
 expect(count(s,'Neutron blaster')).toBe(7);expect(()=>equip(s,'Vespid Stingwing 4 ·',['Neutron rail rifle'])).toThrow();
 expect(()=>equip(squad(s.unit,9),'Vespid Stingwing 1 ·',['T’au flamer'])).toThrow();
 const small={...s,models:9,knightGear:resizeTauGear(s,9)};
 expect(validTauGear(s.unit,small.knightGear??{},9)).toBe(true);expect(count(small,'Neutron blaster')).toBe(9);expect(count(small,'Oversight Drone')).toBe(0);expect(count(small,'Neutron rail rifle')).toBe(0);
});

it('preserves Pathfinder specialist quotas, the grenade-launcher carbine and the Shas’ui drone carrier',()=>{
 let s=equip(squad('Pathfinder Team',10),'Pathfinder 1 ·',['Ion rifle']);
 s=equip(s,'Pathfinder 2 ·',['Ion rifle']);s=equip(s,'Pathfinder 3 ·',['Rail rifle']);
 expect(()=>equip(s,'Pathfinder 4 ·',['Rail rifle'])).toThrow();
 s=equip(s,'Pathfinder Shas’ui ·',['Pulse carbine','Semi-automatic grenade launcher']);
 expect(()=>equip(s,'Pathfinder 4 ·',['Pulse carbine','Semi-automatic grenade launcher'])).toThrow();
 expect(()=>equip(s,'Pathfinder Shas’ui ·',['Rail rifle','Semi-automatic grenade launcher'])).toThrow();
 s=equip(s,'Pathfinder Shas’ui ·',['Recon drone','Drone burst cannon']);
 s=equip(s,'Pathfinder Shas’ui ·',['Gun drone','Gun drone','Twin pulse carbine','Twin pulse carbine']);
 expect(cost(s)).toBe(10);expect(tauModelLoadouts(s)).toHaveLength(10);
 const shasui=tauModelLoadouts(s).find(m=>m.model==='Pathfinder Shas’ui')!;
 expect(shasui.items).toEqual(expect.arrayContaining(['Recon drone','Drone burst cannon','Gun drone','Twin pulse carbine','Semi-automatic grenade launcher']));
 expect(count(s,'Drone burst cannon')).toBe(1);expect(count(s,'Twin pulse carbine')).toBe(2);
});

it('treats the Tidewall defence platform as a paid upgrade on one model and the DS8 turret as conditional',()=>{
 const s=equip(squad('Tidewall Shieldline'),'',['Tidewall defence platform']);
 expect(cost(s)).toBe(20);expect(tauModelLoadouts(s)).toHaveLength(1);expect(tauLoadout(s.unit,2)).toBeUndefined();
 expect(TAU_SHEETS.find(x=>x.unit===s.unit)).toMatchObject({sizes:[1],pointsBySize:{1:85},compositionBySize:{1:{'Tidewall Shieldline':1}},profile:{wounds:10}});
 expect(count(s,'Tidewall defence platform')).toBe(1);expect(tauHasRangedWeapon(s)).toBe(false);
 for(const unit of ['Strike Team','Breacher Team']){expect(count(squad(unit),'Support turret')).toBe(0);expect(TAU_CARDS[unit].weapons.some(w=>w.name==='Support turret')).toBe(true);}
});

it('keeps Twin Lance weapons and drone guns with the correct member',()=>{
 const s=squad('The Twin Lance',2),models=tauModelLoadouts(s);
 expect(models).toHaveLength(2);
 expect(models.find(m=>m.model==='Ri’Lantar')?.items).toEqual(expect.arrayContaining(['Fusion eliminator','MV15 Gun Drone','Twin pulse blaster']));
 expect(models.find(m=>m.model==='Ri’Locai')?.items).toEqual(expect.arrayContaining(['Ion scattercannon','MV15 Gun Drone','Twin pulse blaster']));
 expect(models.find(m=>m.model==='Ri’Locai')?.items).not.toContain('Fusion eliminator');
 expect(count(s,'Twin pulse blaster')).toBe(2);expect(count(s,'Fusion eliminator')).toBe(1);
 expect(TAU_CARDS[s.unit].weapons.filter(w=>w.name==='Fusion eliminator').map(w=>w.phase).sort()).toEqual(['Fight','Shooting']);
});

it('preserves Forge World weapon counts, transport-bay exchange and maximum seeker missiles',()=>{
 let tiger=equip(squad('Tiger Shark'),'',['Seeker missile','Seeker missile','Seeker missile','Seeker missile','Seeker missile','Seeker missile']);
 expect(count(tiger,'Transport bay')).toBe(1);tiger=equip(tiger,'',['Skyspear missile rack','Skyspear missile rack']);
 expect(count(tiger,'Transport bay')).toBe(0);expect(count(tiger,'Skyspear missile rack')).toBe(2);expect(count(tiger,'Seeker missile')).toBe(6);
 expect(count(squad('Manta'),'Seeker missile')).toBe(10);expect(count(squad('Manta'),'Heavy rail cannon')).toBe(2);expect(count(squad('Manta'),'Ion cannon')).toBe(6);
 const taunar=equip(squad('Ta’unar Supremacy Armour'),'',['Fusion eradicator','Fusion eradicator']);
 expect(count(taunar,'Fusion eradicator')).toBe(2);expect(count(taunar,'Tri-axis ion cannon')).toBe(0);
 expect(TAU_SHEETS.filter(s=>s.wargearPoints)).toHaveLength(7);
});
