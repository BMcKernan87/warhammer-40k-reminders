// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,type ArmySelection} from '../src/catalog';
import {generate11thReminders} from '../src/reminders-11th';
import {individualArmy,setInstanceAttachment,setInstanceModelCount} from '../src/roster-instances';
import {greyKnightsLoadout} from '../src/grey-knights-loadouts';
import {setKnightGear} from '../src/knight-loadouts';
import {GREY_KNIGHTS_SHEETS} from '../src/grey-knights-data';
import {GREY_KNIGHTS_REVISION} from '../src/grey-knights-data.generated';

const id=(name:string)=>name+'#1';
function army(names:string[]){let a=individualArmy({...newSelection('Grey Knights'),detachments2026:['Brotherhood Strike']});for(const name of names)a=addSelectionUnit(a,name);return a;}
const join=(a:ArmySelection,leader:string,body:string)=>setInstanceAttachment(a,id(leader),id(body));
const get=(a:ArmySelection,title:string)=>generate11thReminders(a).filter(r=>r.id.startsWith('11e-gk-card')&&r.title===title);
function swap(a:ArmySelection,unit:string,owner:string,items:string[]){
 const s=a.instances!.find(s=>s.unit===unit)!,key=(list:readonly string[])=>[...list].sort().join('|');
 const slot=greyKnightsLoadout(unit,s.models)!.slots.find(s=>s.name.startsWith(owner)&&s.choices.some(c=>key(c.items)===key(items)))!;
 return setKnightGear(a,id(unit),slot.name,slot.choices.find(c=>key(c.items)===key(items))!.name);
}
it('prints every native datasheet ability through the normal generator with the actual unit as source and no duplicate identifiers',()=>{
 const expected:Record<string,string>={
  'Grand Master Voldus':'Sanctuary','Grand Master':'Might of Titan','Brother-captain':'Eye of Judgement','Brotherhood Champion':'Inspiring Exemplar','Castellan Crowe':'Foresight',
  'Strike Squad':'Sanctifying Ritual','Brotherhood Terminator Squad':'Force Edge','Purifier Squad':'Sanctity of Purpose','Paladin Squad':'Attuned Onslaught','Interceptor Squad':'Personal Teleporters','Purgation Squad':'Righteous Persecution',
  'Nemesis Dreadknight':'Indomitable Spirit','Land Raider':'Assault Ramp','Land Raider Crusader':'Assault Ramp','Land Raider Redeemer':'Assault Ramp','Razorback':'Fire Focus','Rhino':'Truesilver Aegis','Stormraven Gunship':'Armoured Resilience',
  'Brotherhood Techmarine':'Blessing of the Omnissiah','Venerable Dreadnought':'Guidance of the Ancients','Grey Knights Thunderhawk Gunship':'Aerial Assault','Grand Master In Nemesis Dreadknight':'Surge of Wrath','Brotherhood Librarian':'Haloed in Soulfire','Brotherhood Chaplain':'Litanies of Sanctity','Stormhawk Interceptor':'Interceptor','Stormtalon Gunship':'Strafing Run',
 };
 expect(Object.keys(expected).sort()).toEqual(GREY_KNIGHTS_SHEETS.map(s=>s.unit).sort());
 for(const [unit,title] of Object.entries(expected)){
  const other=unit==='Brotherhood Librarian'?'Brotherhood Terminator Squad':'Strike Squad';
  let a=army([unit,other,'Venerable Dreadnought']);
  if(unit==='Brotherhood Librarian')a=join(a,unit,other);
  const result=get(a,title);expect(result.length,unit).toBeGreaterThan(0);expect(result.some(r=>r.units?.includes(id(unit))),unit).toBe(true);
  expect(result.every(r=>r.source.includes('wh40k11ed')||r.source===GREY_KNIGHTS_REVISION.pack+'#page=10')).toBe(true);
  const all=generate11thReminders(a).filter(r=>r.id.startsWith('11e-gk-card'));
  expect(new Set(all.map(r=>r.id)).size,unit).toBe(all.length);
 }
});
it('scopes Leader benefits to their real bodyguard, preserves standalone personal abilities and excludes Hit rerolls from snap shooting',()=>{
 let a=army(['Brother-captain','Brotherhood Terminator Squad','Brotherhood Terminator Squad','Castellan Crowe','Purifier Squad','Brotherhood Librarian','Paladin Squad']);
 expect(get(a,'Hammerhand')).toEqual([]);expect(get(a,'Sanctic Hood')).toEqual([]);
 expect(get(a,'Eye of Judgement').map(r=>[r.window,r.turn])).toEqual([['Shooting','own'],['Movement','opponent'],['Fight','either']]);
 expect(get(a,'Foresight').map(r=>r.window)).toEqual(['Shooting','Fight']);
 a=join(a,'Brother-captain','Brotherhood Terminator Squad');a=join(a,'Castellan Crowe','Purifier Squad');a=join(a,'Brotherhood Librarian','Paladin Squad');
 expect(get(a,'Hammerhand')[0].units).toEqual([id('Brother-captain'),id('Brotherhood Terminator Squad')]);
 expect(get(a,'Hammerhand')[0].units).not.toContain('Brotherhood Terminator Squad#2');
 expect(get(a,'Haloed in Soulfire')[0].units).toContain(id('Paladin Squad'));
 expect(get(a,'Champion of the Order of Purifiers')[0].summary).toContain('Purifier Squad#1 (5)');
 expect(get(a,'Champion of the Order of Purifiers')[0].summary).toContain('Castellan Crowe#1 (1)');
});
it('keeps the Ancient and Narthecium conditional on the actual selected bearer and never restores a destroyed Character',()=>{
 let a=army(['Paladin Squad','Grand Master Voldus']);a=join(a,'Grand Master Voldus','Paladin Squad');
 expect(get(a,'Ancient’s Banner')).toEqual([]);expect(get(a,'Apothecary’s Narthecium')).toEqual([]);
 a=swap(a,'Paladin Squad','Paladin 1 ·',["Ancient's banner",'Psycannon']);a=swap(a,'Paladin Squad','Paladin 2 ·',["Apothecary's narthecium"]);
 expect(get(a,'Ancient’s Banner')[0].units).toContain(id('Grand Master Voldus'));
 expect(get(a,'Ancient’s Banner')[0].summary).toContain('bearer survives');
 expect(get(a,'Apothecary’s Narthecium')[0]).toMatchObject({window:'Command',turn:'own',summary:expect.stringContaining('destroyed non-Character')});
 expect(get(a,'Attuned Onslaught')[0].summary).toContain('Paladin Squad models');
 expect(get(a,'Sanctuary').map(r=>[r.window,r.turn])).toEqual([['Shooting','opponent'],['Movement','own'],['Shooting','own'],['Movement','opponent'],['Fight','either']]);
});
it('conditions the Techmarine aura on surviving formations, and shares the Grand Master discount across both printed holders',()=>{
 let a=army(['Brotherhood Techmarine','Purgation Squad','Grand Master','Grand Master In Nemesis Dreadknight','Venerable Dreadnought']);
 a=join(a,'Brotherhood Techmarine','Purgation Squad');
 expect(get(a,'Techmarine')[0].summary).toMatch(/every surviving model.*after its Bodyguard is destroyed/);
 expect(get(a,'Blessing of the Omnissiah').map(r=>r.window)).toEqual(['Command']);
 expect(get(a,'Blessing of the Omnissiah')[0].units).not.toContain(id('Purgation Squad'));
 const strategists=get(a,'Warrior Strategist');expect(strategists).toHaveLength(5);
 expect(strategists[0].summary).toContain('Once per battle round across these Grand Masters');
 expect(strategists[0].units).toEqual([id('Grand Master'),id('Grand Master In Nemesis Dreadknight')]);
});
it('uses paid guns, actual cargo and Deep Strike eligibility for Dreadknight movement and Thunderhawk assault and bombs',()=>{
 let a=army(['Nemesis Dreadknight','Grey Knights Thunderhawk Gunship','Strike Squad','Inquisitor']);
 expect(get(a,'Indomitable Spirit').map(r=>r.window)).toEqual(['Movement','Charge']);
 a=swap(a,'Nemesis Dreadknight','Additional weapons',['Heavy psycannon','Heavy incinerator']);
 expect(get(a,'Indomitable Spirit').map(r=>r.window)).toEqual(['Movement','Shooting','Charge']);
 expect(get(a,'Aerial Assault')[0].units).toContain(id('Strike Squad'));expect(get(a,'Thunderhawk Cluster Bombs')).toHaveLength(1);
 a=join(a,'Inquisitor','Strike Squad');expect(get(a,'Aerial Assault')).toEqual([]);
 a=swap(a,'Grey Knights Thunderhawk Gunship','Thunderhawk cluster bombs',['Hellstrike missile battery']);
 expect(get(a,'Thunderhawk Cluster Bombs')).toEqual([]);
});
it('preserves the actual Purifier attack count, pin duration and teleport charge restriction across size and detachment changes',()=>{
 let a=army(['Castellan Crowe','Purifier Squad','Purgation Squad','Interceptor Squad']);a=join(a,'Castellan Crowe','Purifier Squad');a=setInstanceModelCount(a,id('Purifier Squad'),10);
 a=swap(a,'Purifier Squad','Purifier 1 ·',['Incinerator','Close combat weapon']);
 expect(get(a,'Champion of the Order of Purifiers')[0].summary).toContain('Purifier Squad#1 (10)');
 expect(get(a,'Righteous Persecution').map(r=>[r.window,r.turn])).toEqual([['Shooting','own']]);
 expect(get(a,'Personal Teleporters')[0].summary).not.toContain('Echojump');
 expect(get({...a,detachments2026:['Immaterial Interdiction']},'Personal Teleporters')[0].summary).toContain('cannot also use Personal Teleporters');
});
it('keeps normal Unending Fidelity attacks distinct from snap shooting and ties weapon profiles to each destroyed physical model',()=>{
 let a=army(['Castellan Crowe','Purifier Squad','Brother-captain','Brotherhood Terminator Squad','Nemesis Dreadknight']);
 a=join(a,'Castellan Crowe','Purifier Squad');a=join(a,'Brother-captain','Brotherhood Terminator Squad');
 a=setInstanceModelCount(a,id('Brotherhood Terminator Squad'),5);
 a=swap(a,'Brotherhood Terminator Squad','Terminator 1 ·',["Ancient's banner",'Psycannon']);
 a=swap(a,'Brotherhood Terminator Squad','Terminator 2 ·',["Apothecary's narthecium"]);
 const reaction=(list:ArmySelection,title:string)=>get(list,title).filter(r=>r.window==='Shooting'&&r.turn==='opponent');
 for(const name of ['Eye of Judgement','Foresight','Champion of the Order of Purifiers','Sanctity of Purpose'])expect(reaction(a,name)).toEqual([]);
 a={...a,detachments2026:['Hallowed Conclave']};
 for(const name of ['Eye of Judgement','Foresight','Champion of the Order of Purifiers','Sanctity of Purpose']){
  expect(reaction(a,name)).toHaveLength(1);expect(reaction(a,name)[0].summary).toContain('Unending Fidelity');
 }
 expect(get(a,'Foresight').some(r=>r.window==='Movement')).toBe(false);
 const weapons=generate11thReminders(a).filter(r=>r.title.endsWith('Unending Fidelity · equipped models'));
 expect(weapons.some(r=>r.units?.includes(id('Nemesis Dreadknight')))).toBe(false);
 const terminatorWeapons=weapons.find(r=>r.units?.includes(id('Brotherhood Terminator Squad')))!;
 expect(terminatorWeapons.summary).toContain('Terminator 1 — 1 × Psycannon');
 expect(terminatorWeapons.summary).toContain('Terminator 2 — no ranged weapons');
 expect(terminatorWeapons.summary).toContain('the surviving squad does not shoot');
 expect(terminatorWeapons.summary).not.toMatch(/snap|once per battle/i);
});
