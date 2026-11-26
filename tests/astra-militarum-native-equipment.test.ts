// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {knightLoadoutFor,resizeKnightComposition,setKnightGear,validKnightGear} from '../src/knight-loadouts';
import {equippedItems} from '../src/knight-gear-options';
import {ASTRA_MILITARUM_KITS} from '../src/astra-militarum-loadouts.generated';
import {ASTRA_MILITARUM_NATIVE_ONLY_KITS} from '../src/astra-militarum-native-loadouts.generated';
import {astraMilitarumHasRangedWeapon,astraMilitarumLoadout,astraMilitarumModelLoadouts,astraMilitarumWeaponCount,broodBrotherLoadout} from '../src/astra-militarum-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const faction='Astra Militarum';
const squad=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const count=astraMilitarumWeaponCount;
function equip(s:RosterInstance,slot:string,choice:string){
 const army:ArmySelection={...newSelection(faction),instances:[s],units:{[s.unit]:1}};
 return setKnightGear(army,s.id,slot,choice).instances![0];
}
function change(s:RosterInstance,role:string,item:string){
 const matches=astraMilitarumLoadout(s.unit,s.models)!.slots.filter(f=>f.name.startsWith(role)&&f.choices.some(c=>c.name===item));
 if(matches.length!==1)throw Error('Ambiguous equipment '+s.unit+' '+role+' '+item);
 return equip(s,matches[0].name,item);
}
it.each(ASTRA_MILITARUM_NATIVE_ONLY_KITS.map(k=>[k.unit,k] as const))('%s equips each legal tier and tracks every exchange on the right physical bearer',(unit,kit)=>{
 for(const [total,expected] of Object.entries(kit.tiers)){
  const s=squad(unit,+total),sheet=knightLoadoutFor(faction,unit,+total)!;
  const models=astraMilitarumModelLoadouts(s);
  expect(models.reduce<Record<string,number>>((n,b)=>({...n,[b.model]:(n[b.model]??0)+1}),{})).toEqual(expected);
  expect(models).toHaveLength(+total);
  expect(equippedItems(sheet)).toEqual(expect.arrayContaining(models.flatMap(b=>b.items)));
  expect(broodBrotherLoadout(unit,+total)).toBeUndefined();
  expect(knightLoadoutFor('Genestealer Cults',unit,+total)).toBeUndefined();
  for(const slot of sheet.slots)for(const choice of slot.choices){
   const changed=equip(s,slot.name,choice.name),items=models.flatMap(m=>m.items);
   if(slot.name==='Squad companion'){
    expect(astraMilitarumModelLoadouts(changed)).toEqual(models);
    expect(count(changed,'Ratling Battlemutt')).toBe(choice.items.length);
   }else{
    for(const prev of slot.choices[0].items){
     const index=items.indexOf(prev);expect(index).toBeGreaterThanOrEqual(0);items.splice(index,1);
    }
    expect(astraMilitarumModelLoadouts(changed).flatMap(m=>m.items).sort()).toEqual([...items,...choice.items].sort());
   }
   expect(validKnightGear(changed,faction)).toBe(true);
  }
 }
});
it('reuses all Brood Brother kits in the native editor with unchanged defaults and personal selectors',()=>{
 for(const kit of ASTRA_MILITARUM_KITS)for(const size of Object.keys(kit.tiers)){
  expect(knightLoadoutFor(faction,kit.unit,+size)).toBe(knightLoadoutFor('Genestealer Cults',kit.unit,+size));
 }
 const priest=squad('Ministorum Priest');
 const holy=change(priest,'Priest weapons','Holy pistol + Power weapon');
 expect(count(holy,'Holy pistol')).toBe(1);expect(count(holy,'Zealot’s vindictor')).toBe(0);
 expect(knightLoadoutFor(faction,'Ministorum Priest (Imperial Agents)')).toEqual(knightLoadoutFor('Imperial Agents','Ministorum Priest'));
});
it('keeps the mounted and infantry Graves distinct and equips each of the six Ghosts',()=>{
 expect(count(squad('Commissar Graves'),'Prefectus heavy stubber')).toBe(2);
 expect(count(squad('Commissar Graves on Foot'),'Prefectus heavy stubber')).toBe(0);
 expect(count(squad('Commissar Graves'),'Aquiline Prow')).toBe(1);
 expect(count(squad('Avenger Strike Fighter'),'Lascannon')).toBe(2);
 const ghosts=astraMilitarumModelLoadouts(squad('Gaunt’s Ghosts'));
 expect(ghosts.map(g=>g.items[0])).toEqual(['Bragg’s autocannon','Corbec’s hot-shot lascarbine','Rawne’s lascarbine','Larkin’s long-las','Bolt Pistol','Lascarbine']);
 expect(ghosts.find(g=>g.model==='Oan Mkoll')!.items).toContain('Mkoll’s straight silver knife');
});
it('confines the Ratling dog to its squad and removes each ten-model-only selection when the unit shrinks',()=>{
 let snipers=squad('Ratlings',10);
 snipers=change(snipers,'Squad companion','Ratling Battlemutt');
 snipers=change(snipers,'Ratling Sniper 4 ·','Demolition gear');
 snipers=change(snipers,'Ratling Sniper 4 ·','Close combat weapon + Tankstopper rifle');
 expect(()=>change(snipers,'Ratling Sniper 5 ·','Demolition gear')).toThrow();
 expect(()=>change(snipers,'Ratling Sniper 5 ·','Close combat weapon + Tankstopper rifle')).toThrow();
 expect(astraMilitarumModelLoadouts(snipers).filter(b=>b.items.includes('Demolition gear')&&b.items.includes('Tankstopper rifle'))).toHaveLength(1);
 expect(astraMilitarumModelLoadouts(snipers).some(b=>b.items.includes('Ratling Battlemutt'))).toBe(false);
 expect(count(snipers,'Ratling Battlemutt')).toBe(1);
 const restored=JSON.parse(JSON.stringify(snipers)) as RosterInstance;
 const reduced={...restored,models:9,knightGear:resizeKnightComposition(restored,9,faction)};
 expect(astraMilitarumLoadout('Ratlings',9)!.slots).toHaveLength(0);
 expect(count(reduced,'Sniper rifle')).toBe(9);
 for(const lost of ['Demolition gear','Tankstopper rifle','Ratling Battlemutt'])expect(count(reduced,lost)).toBe(0);
 expect(()=>change(reduced,'Ratling Sniper 1 ·','Demolition gear')).toThrow();
});
it('enforces both the per-type and total Scion special-weapon limits across size changes',()=>{
 let ten=squad('Tempestus Scions',10);
 for(const [n,weapon] of [[1,'Meltagun'],[2,'Meltagun'],[3,'Plasma gun'],[4,'Flamer']] as const){
  ten=change(ten,'Tempestus Scion '+n+' ·',weapon);
 }
 expect(()=>change(ten,'Tempestus Scion 5 ·','Grenade launcher')).toThrow();
 ten=change(ten,'Tempestus Scion 5 ·','Hot-shot laspistol + Vox-caster');
 expect(()=>change(ten,'Tempestus Scion 6 ·','Hot-shot laspistol + Vox-caster')).toThrow();
 const five={...ten,models:5,knightGear:resizeKnightComposition(ten,5,faction)};
 expect(count(five,'Meltagun')).toBe(1);expect(count(five,'Plasma gun – supercharge')).toBe(1);
 expect(count(five,'Flamer')).toBe(0);expect(count(five,'Vox-caster')).toBe(0);
 expect(()=>change(five,'Tempestus Scion 4 ·','Meltagun')).toThrow();
 let cmd=squad('Militarum Tempestus Command Squad');
 cmd=change(cmd,'Tempestor Prime','Command rod');
 cmd=change(cmd,'Tempestus Scion 1 ·','Hot-shot lasgun + Hot-shot laspistol + Medi-pack');
 expect(()=>change(cmd,'Tempestus Scion 2 ·','Hot-shot laspistol + Medi-pack')).toThrow();
 const medic=astraMilitarumModelLoadouts(cmd).find(b=>b.items.includes('Medi-pack'))!;
 expect(medic.items).toEqual(expect.arrayContaining(['Hot-shot laspistol','Hot-shot lasgun']));
 expect(astraMilitarumModelLoadouts(cmd).find(b=>b.model==='Tempestor Prime')!.items).not.toContain('Bolt pistol');
});
it('tracks sentry and dual-pistol bearer separately and restricts Aquilon specialist replacements',()=>{
 let team=squad('Tempestus Aquilons');
 team=change(team,'Tempestor Aquilon','Sentry hot‐shot volley gun');
 team=change(team,'Gunfighter','Close combat weapon + 2 × Hot-shot laspistol');
 team=change(team,'Tempestus Aquilon 1 ·','Plasma carbine');
 expect(()=>change(team,'Tempestus Aquilon 2 ·','Melta carbine')).toThrow();
 team=change(team,'Tempestus Aquilon 2 ·','Hot-shot laspistol');
 team=change(team,'Tempestus Aquilon 3 ·','Hot-shot laspistol');
 expect(()=>change(team,'Tempestus Aquilon 4 ·','Hot-shot laspistol')).toThrow();
 expect(count(team,'Sentry hot-shot volley gun')).toBe(1);
 expect(count(team,'Hot-shot laspistol')).toBe(4);expect(count(team,'Sentry flamer')).toBe(0);
});
it('allows mixed Bullgryn weapons and shields and suppresses ranged effects after the last gun is exchanged',()=>{
 let body=squad('Ogryn Bodyguard');
 body=change(body,'Huge knife','Brute shield');body=change(body,'Ripper gun','Bullgryn maul');
 expect(astraMilitarumHasRangedWeapon(body)).toBe(false);
 let unit=squad('Bullgryn Squad',3);
 unit=change(unit,'Bullgryn Bone','Bullgryn maul');unit=change(unit,'Bullgryn 1 ·','Bullgryn maul');
 expect(count(unit,'Grenadier gauntlet')).toBe(1);expect(astraMilitarumHasRangedWeapon(unit)).toBe(true);
 unit=change(unit,'Bullgryn 2 ·','Bullgryn maul');unit=change(unit,'Bullgryn 2 ·','Brute shield');
 expect(astraMilitarumHasRangedWeapon(unit)).toBe(false);expect(count(unit,'Slabshield')).toBe(2);
});

it('keeps the Death Riders mount profile separate from Lord Marshal Dreir’s mount',()=>{
 expect(count(squad('Death Riders',7),"Steed’s savage claws")).toBe(7);
 expect(count(squad('Lord Marshal Dreir'),'Savage claws')).toBe(1);
 expect(count(squad('Lord Marshal Dreir'),"Steed's savage claws")).toBe(0);
});
it.each(['Warhound Titan','Knight Crusader'])('keeps allied %s weapons editable after setting its model count in a Guard army',unit=>{
 const instance=squad(unit,1),sheet=knightLoadoutFor(faction,unit,1)!;
 const slot=sheet.slots.find(s=>s.name===(unit==='Warhound Titan'?'Plasma arm':'Cannon'))!;
 const choice=slot.choices[1],fitted=equip(instance,slot.name,choice.name);
 const restored={...JSON.parse(JSON.stringify(fitted)),knightGear:resizeKnightComposition(fitted,1,faction)};
 expect(restored.knightGear).toEqual({[slot.name]:choice.name});
 expect(validKnightGear(restored,faction)).toBe(true);
 expect(equippedItems(sheet,restored.knightGear)).toEqual(expect.arrayContaining([...choice.items]));
 expect(knightLoadoutFor(faction,'Chaos Warhound Titan')).toBeUndefined();
 expect(knightLoadoutFor(faction,'Knight Despoiler')).toBeUndefined();
});
