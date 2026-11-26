import {describe,it,expect} from 'vitest';
import {SM_NATIVE_SHEETS,SM_REVISION,SM_VICTRIX_COMPOSITIONS} from '../src/space-marines-native.generated';
import {SM_CARDS,spaceMarineLoadout,spaceMarineModelLoadouts,spaceMarineWeaponCount,validSpaceMarineGear,resizeSpaceMarineGear,spaceMarineHasRangedWeapon} from '../src/space-marines-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,models?:number,knightGear?:Record<string,string>):RosterInstance=>({id:unit+'#1',unit,models,knightGear});
const sheet=(unit:string)=>SM_NATIVE_SHEETS.find(s=>s.unit===unit)!;
const key=(s:string)=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
function choose(unit:string,models:number,role:string,item:string,n=0){
 const fields=spaceMarineLoadout(unit,models)!.slots.filter(s=>s.name.startsWith(role)&&s.choices.some(c=>c.items.some(i=>key(i)===key(item))));
 const field=fields[n];if(!field)throw Error('Missing field '+unit+' '+role+' '+item+' '+n);
 return {[field.name]:field.choices.find(c=>c.items.some(i=>key(i)===key(item)))!.name};
}

describe('complete current Space Marines native roster',()=>{
 it('reconciles all 97 current cards, 199 legal strengths and current source revisions',()=>{
  expect(SM_NATIVE_SHEETS).toHaveLength(97);
  expect(new Set(SM_NATIVE_SHEETS.map(s=>s.unit)).size).toBe(97);
  expect(SM_NATIVE_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(199);
  expect(SM_REVISION).toMatchObject({manual:'1.6',manualFirstSeen:'2026-10-14',publisherVersion:'1.1',exportUpdated:'2026-11-23 01:43:36'});
  for(const unit of ['Astraeus','Thunderhawk Gunship','Victrix Honour Guard','Wardens of Ultramar','Decimus Kill Team','Watch Master','Deathwatch Veterans'])expect(sheet(unit)).toBeDefined();
  for(const unit of ['Tactical Squad','Vanguard Veteran Squad','Kill Team Cassius','Librarian Dreadnought','Deathwing Knights','Crusader Squad','Wolf Guard Headtakers','Example Wargear'])expect(sheet(unit)).toBeUndefined();
 });
 it('includes current publisher keyword corrections and leaves conditional chapter aliases unapplied',()=>{
  expect(sheet('Kayvaan Shrike').keywords).toEqual(expect.arrayContaining(['CHARACTER','EPIC HERO','RAVEN GUARD']));
  expect(sheet('Librarian In Terminator Armour').keywords).toContain('CHARACTER');
  for(const s of SM_NATIVE_SHEETS){expect(s.keywords).not.toContain('DEATHWING');expect(s.keywords).not.toContain('RAVENWING');expect(s.keywords).not.toContain('');}
  expect(SM_NATIVE_SHEETS.filter(s=>s.keywords!.includes('DEATHWATCH'))).toHaveLength(10);
 });
 it('retains ordinary intermediate strengths and the fixed specialist compositions',()=>{
  for(const unit of ['Intercessor Squad','Assault Intercessor Squad','Terminator Squad','Deathwatch Veterans'])expect(Object.keys(sheet(unit).compositionBySize!)).toEqual(['5','6','7','8','9','10']);
  expect(sheet('Intercessor Squad').compositionBySize?.[7]).toEqual({'Intercessor Sergeant':1,Intercessor:6});
  expect(sheet('Intercessor Squad').sizes).toEqual([5,10]);
  expect(Object.keys(sheet('Decimus Kill Team').compositionBySize!)).toEqual(['5','10']);
  expect(Object.keys(sheet('Victrix Honour Guard').compositionBySize!)).toEqual(['3','6']);
  expect(validSpaceMarineGear('Decimus Kill Team',{},6)).toBe(false);
  expect(validSpaceMarineGear('Victrix Honour Guard',{},4)).toBe(false);
 });
 it('retains 29 native Leader roles, ten Support roles and Cato’s conditional base role',()=>{
  expect(SM_NATIVE_SHEETS.filter(s=>s.attachmentRole==='leader')).toHaveLength(29);
  expect(SM_NATIVE_SHEETS.filter(s=>s.attachmentRole==='support').map(s=>s.unit)).toEqual(['Ancient','Ancient In Terminator Armour','Apothecary','Apothecary Biologis','Bladeguard Ancient','Judiciar','Kaius Konorius','Lieutenant','Lieutenant In Phobos Armour','Wardens of Ultramar']);
  expect(sheet('Cato Sicarius')).toMatchObject({attachmentRole:'leader',bodyguards:['Victrix Honour Guard']});
  expect(sheet('Captain').bodyguards).toContain('Fortis Kill Team');
  expect(sheet('Captain In Terminator Armour').bodyguards).toContain('Deathwatch Terminator Squad');
 });
 it('retains 41 later-copy price tables and all nine cards with paid physical equipment',()=>{
  expect(SM_NATIVE_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(41);
  expect(SM_NATIVE_SHEETS.filter(s=>s.wargearPoints).map(s=>s.unit)).toEqual(['Deathwatch Terminator Squad','Desolation Squad','Impulsor','Invader ATVs','Redemptor Dreadnought','Repulsor Executioner','Terminator Assault Squad','Terminator Squad','Victrix Honour Guard']);
  expect(sheet('Victrix Honour Guard').wargearPoints).toEqual({'Banner of Macragge':15});
  expect(sheet('Deathwatch Terminator Squad').wargearPoints).toEqual({'Storm Shield':5,'Cyclone Missile Launcher':10});
 });
 it('preserves actual Company Heroes, Wardens and mixed Kill Team identities',()=>{
  expect(sheet('Company Heroes').keywords).not.toContain('CHARACTER');
  expect(sheet('Company Heroes').modelKeywords).toEqual({Ancient:['ANCIENT','CHARACTER'],'Company Champion':['CHAMPION']});
  expect(sheet('Wardens of Ultramar').modelKeywords).toEqual({'Dainal Kornelius':['PSYKER']});
  expect(spaceMarineModelLoadouts(squad('Wardens of Ultramar',6)).map(m=>m.model)).toContain('Dainal Kornelius');
  expect(sheet('Talonstrike Kill Team').modelKeywords?.['Kill Team Heavy Intercessor with Jump Pack']).toEqual(['GRAVIS']);
  expect(sheet('Talonstrike Kill Team').modelKeywords?.['Kill Team Sergeant with Jump Pack']).toEqual(['TACTICUS']);
  expect(spaceMarineModelLoadouts(squad('Decimus Kill Team',5)).filter(m=>m.model.includes('Xenophase'))).toHaveLength(0);
  expect(spaceMarineModelLoadouts(squad('Decimus Kill Team',10)).filter(m=>m.model.includes('Xenophase'))).toHaveLength(1);
  expect(spaceMarineModelLoadouts(squad('Decimus Kill Team',10)).filter(m=>m.model==='Gravis Veteran')).toHaveLength(2);
 });
 for(const s of SM_NATIVE_SHEETS)it(s.unit+' has legal physical equipment at every permitted strength and can reach every printed weapon',()=>{
  const sizes=Object.keys(s.compositionBySize!).map(Number);
  for(const size of sizes){
   expect(validSpaceMarineGear(s.unit,{},size)).toBe(true);
   expect(spaceMarineModelLoadouts(squad(s.unit,size))).toHaveLength(size);
   expect(spaceMarineModelLoadouts(squad(s.unit,size)).every(m=>m.items.length>0)).toBe(s.unit!=='Drop Pod');
   expect(validSpaceMarineGear(s.unit,{invented:'weapon'},size)).toBe(false);
  }
  for(const w of SM_CARDS[s.unit].weapons){
   const possible=sizes.some(size=>{
    const candidate=squad(s.unit,size);
    if(spaceMarineWeaponCount(candidate,w.name))return true;
    return spaceMarineLoadout(s.unit,size)!.slots.some(field=>field.choices.some(c=>{
     const gear={[field.name]:c.name};return validSpaceMarineGear(s.unit,gear,size)&&spaceMarineWeaponCount({...candidate,knightGear:gear},w.name)>0;
    }));
   });
   expect(possible,w.name+' is reachable on a legal physical bearer').toBe(true);
  }
 });
});

describe('Space Marines physical equipment, model replacements and limits',()=>{
 it('preserves optional Reiver equipment on the whole unit without inventing a physical bearer',()=>{
  const unit='Reiver Squad',gear={'Grav-chutes':'Grav-chutes','Grapnel Launchers':'Grapnel Launchers'};
  for(const models of [5,7,10]){
   const s=squad(unit,models,gear);
   expect(validSpaceMarineGear(unit,gear,models)).toBe(true);
   expect(spaceMarineWeaponCount(s,'Grav-chutes')).toBe(1);expect(spaceMarineWeaponCount(s,'Grapnel Launchers')).toBe(1);
   expect(spaceMarineModelLoadouts(s).flatMap(m=>m.items)).not.toContain('Grav-chutes');
   expect(spaceMarineModelLoadouts(s).flatMap(m=>m.items)).not.toContain('Grapnel Launchers');
   expect(resizeSpaceMarineGear(s,5)).toEqual(gear);
  }
  expect(spaceMarineWeaponCount(squad(unit,5),'Grav-chutes')).toBe(0);
  expect(validSpaceMarineGear(unit,{'Grav-chutes':'2 × Grav-chutes'},5)).toBe(false);
 });
 it('keeps the current Drop Pod as one unarmed physical model',()=>{
  expect(spaceMarineModelLoadouts(squad('Drop Pod',1))).toEqual([{model:'Drop Pod',items:[]}]);
  expect(SM_CARDS['Drop Pod'].weapons).toHaveLength(0);
  expect(spaceMarineHasRangedWeapon(squad('Drop Pod',1))).toBe(false);
 });
 for(const [unit,size,weapon,secondary] of [['Aggressor Squad',3,'Auto Boltstorm Gauntlets','Flamestorm Gauntlets'],['Inceptor Squad',3,'Plasma Exterminators','Assault Bolters']] as const)it(unit+' offers one whole-unit exchange with each actual model equipped correctly',()=>{
  const gear=choose(unit,size,'Unit weapons',weapon),s=squad(unit,size,gear);
  expect(spaceMarineLoadout(unit,size)!.slots).toHaveLength(1);
  expect(validSpaceMarineGear(unit,gear,size)).toBe(true);
  expect(spaceMarineWeaponCount(s,weapon)).toBe(size);expect(spaceMarineWeaponCount(s,secondary)).toBe(0);
  expect(spaceMarineModelLoadouts(s).every(m=>m.items.includes(weapon))).toBe(true);
  if(unit==='Aggressor Squad')expect(spaceMarineWeaponCount(s,'Fragstorm Grenade Launcher')).toBe(3);
  expect(resizeSpaceMarineGear(s,6)).toEqual(gear);
 });
 it('keeps the Eliminator Sergeant’s independent weapon alongside the ordinary models’ shared exchange',()=>{
  const s=squad('Eliminator Squad',3,{...choose('Eliminator Squad',3,'Eliminator weapons','Las Fusil'),...choose('Eliminator Squad',3,'Eliminator Sergeant','Instigator Bolt Carbine')});
  expect(validSpaceMarineGear(s.unit,s.knightGear!,3)).toBe(true);
  expect(spaceMarineWeaponCount(s,'Las Fusil')).toBe(2);expect(spaceMarineWeaponCount(s,'Instigator Bolt Carbine')).toBe(1);expect(spaceMarineWeaponCount(s,'Bolt Sniper Rifle')).toBe(0);
 });
 it('replaces only the Desolation Sergeant’s shared weapon with the paid Vengor Launcher',()=>{
  const s=squad('Desolation Squad',5,{...choose('Desolation Squad',5,'Unit weapons','Superkrak Rocket Launcher'),...choose('Desolation Squad',5,'Desolation Sergeant','Vengor Launcher')});
  expect(validSpaceMarineGear(s.unit,s.knightGear!,5)).toBe(true);
  expect(spaceMarineWeaponCount(s,'Superkrak Rocket Launcher')).toBe(4);expect(spaceMarineWeaponCount(s,'Vengor Launcher')).toBe(1);
  expect(spaceMarineWeaponCount(s,'Superfrag Rocket Launcher')).toBe(0);expect(spaceMarineWeaponCount(s,'Castellan Launcher')).toBe(5);
 });
 it('retains Vanguard whole-unit shields and caps ordinary plasma pistols independently of the Sergeant',()=>{
  const unit='Vanguard Veteran Squad With Jump Packs',shield=choose(unit,5,'Unit weapons','Combat Shield'),s=squad(unit,5,shield);
  expect(validSpaceMarineGear(unit,shield,5)).toBe(true);expect(spaceMarineWeaponCount(s,'Combat Shield')).toBe(5);expect(spaceMarineHasRangedWeapon(s)).toBe(false);
  const one=choose(unit,5,'Vanguard Veteran with Jump Pack','Plasma pistol'),two=choose(unit,5,'Vanguard Veteran with Jump Pack','Plasma pistol',1),three=choose(unit,5,'Vanguard Veteran with Jump Pack','Plasma pistol',2),sergeant=choose(unit,5,'Vanguard Veteran Sergeant','Plasma pistol');
  expect(validSpaceMarineGear(unit,{...one,...two,...sergeant},5)).toBe(true);expect(validSpaceMarineGear(unit,{...one,...two,...three},5)).toBe(false);
  expect(spaceMarineWeaponCount(squad(unit,5,{...one,...two,...sergeant}),'Heavy Bolt Pistol')).toBe(2);
  expect(validSpaceMarineGear(unit,{...shield,...one},5)).toBe(false);
 });
 it('retains two actual Godhammer Lascannons on the Land Raider',()=>{
  expect(spaceMarineWeaponCount(squad('Land Raider',1),'Godhammer Lascannon')).toBe(2);
 });
 it('enforces Intercessor and Terminator special-weapon caps at actual intermediate strengths',()=>{
  for(const [unit,role,item] of [['Intercessor Squad','Intercessor','Grenade Launcher'],['Terminator Squad','Terminator','Cyclone Missile Launcher']] as const){
   const one=choose(unit,9,role,item),two=choose(unit,9,role,item,1);
   expect(validSpaceMarineGear(unit,one,9)).toBe(true);expect(validSpaceMarineGear(unit,{...one,...two},9)).toBe(false);expect(validSpaceMarineGear(unit,{...one,...two},10)).toBe(true);
   expect(spaceMarineWeaponCount(squad(unit,10,{...one,...two}),item)).toBe(2);
  }
 });
 it('caps Black Shield blades at one Veteran and preserves separate Veteran weapon caps',()=>{
  const unit='Deathwatch Veterans',one=choose(unit,10,'Deathwatch Veteran','Black Shield blades'),two=choose(unit,10,'Deathwatch Veteran','Black Shield blades',1);
  expect(validSpaceMarineGear(unit,one,10)).toBe(true);expect(validSpaceMarineGear(unit,{...one,...two},10)).toBe(false);
  const first=choose(unit,10,'Deathwatch Veteran','Frag cannon'),second=choose(unit,10,'Deathwatch Veteran','Frag cannon',1),third=choose(unit,10,'Deathwatch Veteran','Frag cannon',2);
  expect(validSpaceMarineGear(unit,{...first,...second},10)).toBe(true);expect(validSpaceMarineGear(unit,{...first,...second,...third},10)).toBe(false);
  expect(validSpaceMarineGear(unit,{...first,...second},9)).toBe(false);
 });
 it('counts each paid shield or missile launcher on its actual Terminator bearer',()=>{
  const unit='Deathwatch Terminator Squad',one=choose(unit,5,'Deathwatch Terminator','Cyclone missile launcher'),two=choose(unit,5,'Deathwatch Terminator','Cyclone missile launcher',1),three=choose(unit,5,'Deathwatch Terminator','Cyclone missile launcher',2),four=choose(unit,5,'Deathwatch Terminator','Cyclone missile launcher',3);
  const s=squad(unit,5,{...one,...two,...three});
  expect(validSpaceMarineGear(unit,s.knightGear!,5)).toBe(true);expect(validSpaceMarineGear(unit,{...s.knightGear,...four},5)).toBe(false);
  expect(spaceMarineWeaponCount(s,'Cyclone Missile Launcher')).toBe(3);expect(spaceMarineWeaponCount(s,'Storm Bolter')).toBe(5);
  const shield=choose(unit,5,'Deathwatch Terminator Sergeant','Storm shield');
  expect(spaceMarineWeaponCount(squad(unit,5,shield),'Storm Shield')).toBe(1);expect(spaceMarineWeaponCount(squad(unit,5,shield),'Storm Bolter')).toBe(4);
 });
 it('keeps each Invader ATV’s paid Multi-melta independent',()=>{
  const s=squad('Invader ATVs',2,choose('Invader ATVs',2,'Invader ATV','Multi-melta'));
  expect(validSpaceMarineGear(s.unit,s.knightGear!,2)).toBe(true);expect(spaceMarineWeaponCount(s,'Multi-melta')).toBe(1);expect(spaceMarineWeaponCount(s,'Onslaught Gatling Cannon')).toBe(1);
 });
 it('preserves all eight Victrix specialist configurations with the Banner on its actual Ancient',()=>{
  expect(Object.values(SM_VICTRIX_COMPOSITIONS).flat()).toHaveLength(8);
  for(const [sizeText,alternatives] of Object.entries(SM_VICTRIX_COMPOSITIONS))for(const comp of alternatives){
   const size=Number(sizeText),fields=spaceMarineLoadout('Victrix Honour Guard',size)!.slots,gear:Record<string,string>={};let field=0;
   for(const role of ['Chapter Ancient','Chapter Champion'])if(comp[role])gear[fields[field++].name]=role;
   const s=squad('Victrix Honour Guard',size,gear),models=spaceMarineModelLoadouts(s);
   expect(validSpaceMarineGear(s.unit,gear,size)).toBe(true);expect(models).toHaveLength(size);
   for(const [role,count] of Object.entries(comp))expect(models.filter(m=>m.model===role)).toHaveLength(count);
   expect(spaceMarineWeaponCount(s,'Banner of Macragge')).toBe(comp['Chapter Ancient']);
   expect(spaceMarineWeaponCount(s,'Master-crafted Bolt Carbine')).toBe(size-comp['Chapter Champion']);
   expect(spaceMarineWeaponCount(s,'Blades of Honour')).toBe(comp['Chapter Champion']);
  }
 });
 it('rejects duplicate Victrix specialists and retains legal model selection when resizing',()=>{
  const unit='Victrix Honour Guard',fields=spaceMarineLoadout(unit,6)!.slots;
  for(const role of ['Chapter Ancient','Chapter Champion'])expect(validSpaceMarineGear(unit,{[fields[0].name]:role,[fields[1].name]:role},6)).toBe(false);
  const original=squad(unit,6,{[fields[0].name]:'Chapter Ancient',[fields[1].name]:'Chapter Champion'}),small=squad(unit,3,resizeSpaceMarineGear(original,3));
  expect(spaceMarineModelLoadouts(small).map(m=>m.model)).toEqual(['Chapter Ancient','Chapter Champion','Victrix Honour Guard']);
  expect(validSpaceMarineGear(unit,small.knightGear!,3)).toBe(true);
 });
});
