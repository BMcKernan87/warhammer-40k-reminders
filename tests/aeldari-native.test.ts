import {describe,it,expect} from 'vitest';
import {AELDARI_NATIVE_SHEETS,AELDARI_REVISION,AELDARI_VOIDSCARRED_COMPOSITIONS} from '../src/aeldari-native.generated';
import {AELDARI_CARDS,aeldariLoadout,aeldariModelLoadouts,aeldariWeaponCount,validAeldariGear,resizeAeldariGear,aeldariHasRangedWeapon} from '../src/aeldari-loadouts';
import {aeldariMusterUnits} from '../src/aeldari-muster-data';
import type {ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,models?:number,knightGear?:Record<string,string>):RosterInstance=>({id:unit+'#1',unit,models,knightGear});
const sheet=(unit:string)=>AELDARI_NATIVE_SHEETS.find(s=>s.unit===unit)!;
function choose(unit:string,models:number,role:string,item:string,n=0){
 const fields=aeldariLoadout(unit,models)!.slots.filter(s=>s.name.startsWith(role)&&s.choices.some(c=>c.items.includes(item)));
 const field=fields[n];if(!field)throw Error('Missing field '+unit+' '+role+' '+item+' '+n);
 return {[field.name]:field.choices.find(c=>c.items.includes(item))!.name};
}

describe('complete current Aeldari native roster',()=>{
 it('reconciles all76 matched-play cards,166 strengths and the current source revisions',()=>{
  expect(AELDARI_NATIVE_SHEETS).toHaveLength(76);
  expect(new Set(AELDARI_NATIVE_SHEETS.map(s=>s.unit)).size).toBe(76);
  expect(AELDARI_NATIVE_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(166);
  expect(AELDARI_REVISION).toMatchObject({packVersion:'1.4',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
  for(const unit of ['Clanblade','Dragon Knights','Leystalker','Stonesinger','Phantom Titan','Revenant Titan','Vypers','Ynnari Archon','Ynnari Incubi','Ynnari Kabalite Warriors','Ynnari Raider','Ynnari Reavers','Ynnari Succubus','Ynnari Venom','Ynnari Wyches'])expect(sheet(unit)).toBeDefined();
  for(const unit of ['Vyper','Autarch Skyrunner','Corsair Reaver Band','Corsair Cloud Dancer Band','Hornet','Wraithseer','Scorpion','Cobra','Lynx'])expect(sheet(unit)).toBeUndefined();
 });
 it('preserves native faction tags without applying conditional Ynnari aliases',()=>{
  for(const s of AELDARI_NATIVE_SHEETS){
   expect(s.keywords).not.toContain('DRUKHARI');
   expect(s.keywords).not.toContain('');
   expect(s.keywords!.filter(k=>['ASURYANI','HARLEQUINS','YNNARI'].includes(k))).toHaveLength(1);
  }
  expect(AELDARI_NATIVE_SHEETS.filter(s=>s.keywords!.includes('YNNARI'))).toHaveLength(11);
  expect(sheet('Corsair Voidscarred').keywords).not.toContain('PSYKER');
  expect(sheet('Corsair Voidscarred').modelKeywords).toEqual({'Way Seeker':['PSYKER']});
  expect(sheet('Vypers').keywords).toContain('VYPERS');
 });
 it('offers Harlequins normally and Ynnari only under Devoted of Ynnead',()=>{
  const a={faction:'Aeldari',units:[],detachments2026:[]} as ArmySelection;
  expect(aeldariMusterUnits(a)).toHaveLength(65);
  expect(aeldariMusterUnits(a)).toContain('Troupe');
  expect(aeldariMusterUnits(a)).not.toContain('Yvraine');
  expect(aeldariMusterUnits({...a,detachments2026:['Devoted of Ynnead']})).toHaveLength(76);
 });
 it('keeps MFM Leader eligibility and mandatory Support roles distinct',()=>{
  expect(AELDARI_NATIVE_SHEETS.filter(s=>s.attachmentRole==='leader')).toHaveLength(19);
  expect(AELDARI_NATIVE_SHEETS.filter(s=>s.attachmentRole==='support').map(s=>s.unit)).toEqual(['Stonesinger','The Visarch','Warlock','Warlock Conclave','Warlock Skyrunners']);
  expect(sheet('Farseer Skyrunner').bodyguards).toEqual(['Warlock Skyrunners','Windriders']);
  expect(sheet('Farseer').bodyguards).toEqual(['Guardian Defenders','Storm Guardians']);
  expect(sheet('Spiritseer').attachmentRole).toBeUndefined();
  for(const n of ['D-cannon Platform','Shadow Weaver Platform','Vibro Cannon Platform'])expect(sheet(n).attachmentRole).toBeUndefined();
 });
 it('retains thirteen later-copy price tables and the actual paid Wraithknight cannon',()=>{
  expect(AELDARI_NATIVE_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(13);
  expect(AELDARI_NATIVE_SHEETS.filter(s=>s.wargearPoints).map(s=>[s.unit,s.wargearPoints])).toEqual([['Wraithknight',{'Heavy wraithcannon':10}]]);
  expect(sheet('Wraithknight with Ghostglaive').wargearPoints).toBeUndefined();
 });
 it('keeps support platforms and differing Exarch profiles as physical models',()=>{
  expect(sheet('Guardian Defenders').compositionBySize?.[11]).toEqual({'Guardian Defender':10,'Heavy Weapon Platform':1});
  expect(sheet('Storm Guardians').compositionBySize?.[11]).toEqual({'Storm Guardian':10,'Serpent’s Scale Platform':1});
  expect(sheet('Dragon Knights').compositionBySize?.[6]).toEqual({'Dragon Knight Leader':1,'Dragon Knight':5});
  for(const unit of ['Crimson Hunter','Hemlock Wraithfighter'])expect(sheet(unit).profile).toMatchObject({move:'-',objectiveControl:'-'});
 });
 for(const s of AELDARI_NATIVE_SHEETS)it(s.unit+' has legal equipment on every physical bearer at every strength',()=>{
  const sizes=Object.keys(s.compositionBySize!).map(Number);
  for(const size of sizes){
   expect(validAeldariGear(s.unit,{},size)).toBe(true);
   expect(aeldariModelLoadouts(squad(s.unit,size))).toHaveLength(size);
   expect(aeldariModelLoadouts(squad(s.unit,size)).every(m=>m.items.length>0)).toBe(true);
   expect(validAeldariGear(s.unit,{invented:'weapon'},size)).toBe(false);
  }
  for(const w of AELDARI_CARDS[s.unit].weapons){
   const possible=sizes.some(size=>{
    const candidate=squad(s.unit,size);
    if(aeldariWeaponCount(candidate,w.name))return true;
    return aeldariLoadout(s.unit,size)!.slots.some(field=>field.choices.some(c=>{
     const gear={[field.name]:c.name};return validAeldariGear(s.unit,gear,size)&&aeldariWeaponCount({...candidate,knightGear:gear},w.name)>0;
    }));
   });
   expect(possible,w.name+' is reachable on a legal physical bearer').toBe(true);
  }
 });
});

describe('Aeldari physical equipment and unit-token limits',()=>{
 for(const unit of ['Dark Reapers','Dire Avengers','Fire Dragons','Howling Banshees','Striking Scorpions','Swooping Hawks','Warp Spiders'])it(unit+' has unit-level Aspect Shrine tokens capped by actual strength',()=>{
  const five=squad(unit,5,{'Aspect Shrine tokens':'Aspect Shrine token'}),ten=squad(unit,10,{'Aspect Shrine tokens':'2 × Aspect Shrine token'});
  expect(validAeldariGear(unit,five.knightGear!,5)).toBe(true);
  expect(validAeldariGear(unit,ten.knightGear!,10)).toBe(true);
  expect(validAeldariGear(unit,ten.knightGear!,9)).toBe(false);
  expect(aeldariWeaponCount(ten,'Aspect Shrine token')).toBe(2);
  expect(aeldariModelLoadouts(ten)).toHaveLength(10);
  expect(aeldariModelLoadouts(ten).flatMap(m=>m.items)).not.toContain('Aspect Shrine token');
  expect(resizeAeldariGear(ten,5)).toEqual({'Aspect Shrine tokens':'Aspect Shrine token'});
 });
 it('caps Dragon Knight Drakolithe per three models and keeps Leystalker fixed tokens',()=>{
  for(const n of [3,4,5])expect(aeldariLoadout('Dragon Knights',n)!.slots.find(s=>s.name==='Drakolithe')!.choices).toHaveLength(3);
  const large=squad('Dragon Knights',6,{Drakolithe:'4 × Drakolithe'});
  expect(validAeldariGear(large.unit,large.knightGear!,6)).toBe(true);
  expect(validAeldariGear(large.unit,large.knightGear!,5)).toBe(false);
  expect(aeldariWeaponCount(large,'Drakolithe')).toBe(4);
  expect(resizeAeldariGear(large,3)).toEqual({Drakolithe:'2 × Drakolithe'});
  expect(aeldariWeaponCount(squad('Leystalker',1),'Drakolithe')).toBe(2);
  expect(aeldariWeaponCount(squad('Leystalker',1),'Hunting blades')).toBe(1);
 });
 for(const [unit,weapon,secondary] of [['Wraithguard','D-scythe','Wraithcannon'],['Wraithblades','Ghostaxe','Ghostswords']])it(unit+' uses one legal whole-unit weapon choice with actual bearer equipment',()=>{
  const gear=choose(unit,5,'Unit weapons',weapon),s=squad(unit,5,gear);
  expect(aeldariLoadout(unit,5)!.slots).toHaveLength(1);
  expect(validAeldariGear(unit,gear,5)).toBe(true);
  expect(aeldariWeaponCount(s,weapon)).toBe(5);
  expect(aeldariWeaponCount(s,secondary)).toBe(0);
  expect(aeldariModelLoadouts(s).every(m=>m.items.includes(weapon))).toBe(true);
  expect(validAeldariGear(unit,{'Wraithblade 1 · Ghostswords alternatives':'Ghostaxe'},5)).toBe(false);
  expect(resizeAeldariGear(s,5)).toEqual(gear);
 });
 it('keeps two independent cannon mounts on each War Walker',()=>{
  expect(aeldariWeaponCount(squad('War Walkers',2),'Shuriken cannon')).toBe(4);
  const kit=aeldariLoadout('War Walkers',2)!,one=kit.slots[0],two=kit.slots[1];
  expect(one.choices).toHaveLength(15);expect(two.choices).toHaveLength(15);
  const mixed=one.choices.find(c=>c.items.includes('Bright lance')&&c.items.includes('Starcannon'))!;
  const s=squad('War Walkers',2,{[one.name]:mixed.name});
  expect(aeldariWeaponCount(s,'Bright lance')).toBe(1);expect(aeldariWeaponCount(s,'Starcannon')).toBe(1);expect(aeldariWeaponCount(s,'Shuriken cannon')).toBe(2);
 });
 it('retains two Wraithlord wrist mounts, two optional heavy mounts and its optional blade',()=>{
  expect(aeldariWeaponCount(squad('Wraithlord',1),'Shuriken catapult')).toBe(2);
  const gear={...choose('Wraithlord',1,'','Ghostglaive'),...choose('Wraithlord',1,'','Flamer')};
  const s=squad('Wraithlord',1,gear);
  expect(validAeldariGear(s.unit,gear,1)).toBe(true);expect(aeldariWeaponCount(s,'Ghostglaive')).toBe(1);expect(aeldariWeaponCount(s,'Wraithbone fists')).toBe(1);
  expect(aeldariModelLoadouts(s)).toHaveLength(1);
 });
 it('counts each paid Wraithknight cannon and removes its actual scattershield',()=>{
  const fields=aeldariLoadout('Wraithknight',1)!.slots.filter(s=>s.choices.some(c=>c.items.includes('Heavy wraithcannon')));
  const gear=Object.fromEntries(fields.map(s=>[s.name,[...s.choices].sort((a,b)=>b.items.filter(i=>i==='Heavy wraithcannon').length-a.items.filter(i=>i==='Heavy wraithcannon').length)[0].name]));
  const s=squad('Wraithknight',1,gear);
  expect(validAeldariGear(s.unit,gear,1)).toBe(true);
  expect(aeldariWeaponCount(s,'Heavy wraithcannon')).toBe(2);expect(aeldariWeaponCount(s,'Scattershield')).toBe(0);
 });
 it('gives a Dire Avenger Exarch exactly one melee alternative and one pistol or shield',()=>{
  const field=aeldariLoadout('Dire Avengers',5)!.slots.find(s=>s.name.startsWith('Dire Avenger Exarch'))!;
  expect(field.choices).toHaveLength(6);
  for(const c of field.choices){
   const guns=c.items.filter(i=>i==='Avenger shuriken catapult').length;
   expect(c.items.filter(i=>i==='Close combat weapon')).toHaveLength(1);
   if(guns){expect(guns).toBeLessThanOrEqual(2);expect(c.items).toHaveLength(guns+1);}
   else{expect(c.items.filter(i=>['Diresword','Power glaive'].includes(i))).toHaveLength(1);expect(c.items.filter(i=>['Shuriken pistol','Shimmershield'].includes(i))).toHaveLength(1);expect(c.items).toHaveLength(3);}
  }
  expect(validAeldariGear('Dire Avengers',{[field.name]:'Close combat weapon + Diresword + Power glaive + Shimmershield + Shuriken pistol'},5)).toBe(false);
 });
 it('preserves both independent Phantom Titan arms plus its mandatory shoulder gun',()=>{
  const field=aeldariLoadout('Phantom Titan',1)!.slots[0];
  expect(field.choices).toHaveLength(20);
  for(const c of field.choices){
   const count=(name:string)=>c.items.filter(i=>i===name).length;
   const blades=count('Wraith glaive'),big=count('D-bombard')+count('Phantom pulsar'),guns=count('Phantom starcannon')+count('Pulse laser');
   expect(blades+big).toBe(2);expect(guns).toBe(1+2*blades);
  }
  for(const gun of ['D-bombard','Phantom pulsar'])expect(field.choices.some(c=>c.items.filter(i=>i===gun).length===2&&c.items.includes('Pulse laser'))).toBe(true);
  expect(field.choices.some(c=>c.items.filter(i=>i==='Pulse laser').length===5&&c.items.filter(i=>i==='Wraith glaive').length===2)).toBe(true);
 });
 it('retains physical guardian platforms and gives heavy guns only to the weapon platform',()=>{
  const s=squad('Guardian Defenders',11,choose('Guardian Defenders',11,'Heavy Weapon Platform','Bright lance'));
  expect(aeldariModelLoadouts(s).filter(m=>m.model==='Guardian Defender')).toHaveLength(10);
  expect(aeldariModelLoadouts(s).find(m=>m.model==='Heavy Weapon Platform')!.items).toContain('Bright lance');
  expect(aeldariWeaponCount(s,'Shuriken catapult')).toBe(10);
 });
 it('enforces paired Storm Guardian special weapons and power swords',()=>{
  const one=choose('Storm Guardians',11,'Storm Guardian','Flamer'),two=choose('Storm Guardians',11,'Storm Guardian','Flamer',1),three=choose('Storm Guardians',11,'Storm Guardian','Flamer',2);
  expect(validAeldariGear('Storm Guardians',{...one,...two},11)).toBe(true);
  expect(validAeldariGear('Storm Guardians',{...one,...two,...three},11)).toBe(false);
 });
 it('preserves all36 optional Corsair specialist compositions and their melee weapons',()=>{
  expect(Object.values(AELDARI_VOIDSCARRED_COMPOSITIONS).flat()).toHaveLength(36);
  for(const [sizeText,alternatives] of Object.entries(AELDARI_VOIDSCARRED_COMPOSITIONS))for(const comp of alternatives){
   const size=Number(sizeText),fields=aeldariLoadout('Corsair Voidscarred',size)!.slots.filter(s=>s.choices.some(c=>c.name==='Way Seeker')),gear:Record<string,string>={};let field=0;
   for(const role of ['Shade Runner','Soul Weaver','Way Seeker'])if(comp[role])gear[fields[field++].name]=role;
   const s=squad('Corsair Voidscarred',size,gear),models=aeldariModelLoadouts(s);
   expect(validAeldariGear(s.unit,gear,size)).toBe(true);expect(models).toHaveLength(size);
   for(const [role,count] of Object.entries(comp))expect(models.filter(m=>m.model===role)).toHaveLength(count);
   for(const m of models.filter(m=>['Shade Runner','Soul Weaver','Way Seeker'].includes(m.model)))expect(m.items).toContain('Close combat weapon');
  }
 });
 it('rejects duplicate optional specialists and retains legal specialists through resize',()=>{
  const fields=aeldariLoadout('Corsair Voidscarred',10)!.slots.filter(s=>s.choices.some(c=>c.name==='Way Seeker'));
  expect(validAeldariGear('Corsair Voidscarred',{[fields[0].name]:'Way Seeker',[fields[1].name]:'Way Seeker'},10)).toBe(false);
  const original=squad('Corsair Voidscarred',10,{[fields[0].name]:'Way Seeker'});
  expect(aeldariModelLoadouts(squad(original.unit,6,resizeAeldariGear(original,6))).filter(m=>m.model==='Way Seeker')).toHaveLength(1);
  expect(aeldariModelLoadouts(squad(original.unit,5,resizeAeldariGear(original,5))).some(m=>m.model==='Way Seeker')).toBe(false);
 });
 it('preserves both ranged and melee use of the same Chainsabres equipment',()=>{
  const s=squad('Striking Scorpions',5,choose('Striking Scorpions',5,'Striking Scorpion Exarch','Chainsabres'));
  expect(aeldariWeaponCount(s,'Chainsabres – ranged')).toBe(1);expect(aeldariWeaponCount(s,'Chainsabres – melee')).toBe(1);
  expect(aeldariHasRangedWeapon(s)).toBe(true);
 });
});
