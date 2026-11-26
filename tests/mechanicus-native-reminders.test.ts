// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {MECHANICUS_SHEETS} from '../src/mechanicus-data.generated';
import {MECHANICUS_ARMY_SHEETS} from '../src/mechanicus-army-data';
import {mechanicusLoadout,validMechanicusGear} from '../src/mechanicus-loadouts';
import {mechanicusIntrinsicReminders} from '../src/mechanicus-intrinsic';
import {mechanicusProfileReminders,mechanicusFormationScoutRange} from '../src/mechanicus-datasheet-core';
import {mechanicusFormations} from '../src/mechanicus-transports';
import type {RosterInstance} from '../src/roster-instances';

const id=(unit:string)=>unit+'#1';
function army(names:string[],detachments:string[]=[]):ArmySelection{
 const units:Record<string,number>={},instances:RosterInstance[]=[];
 for(const unit of names){units[unit]=(units[unit]??0)+1;instances.push({unit,id:unit+'#'+units[unit],models:MECHANICUS_ARMY_SHEETS.find(s=>s.unit===unit)?.sizes[0]??1});}
 return {...newSelection('Adeptus Mechanicus'),units,instances,detachments2026:detachments};
}
const join=(a:ArmySelection,leader:string,body:string)=>({...a,instances:a.instances!.map(s=>s.id===id(leader)?{...s,attachedTo:id(body)}:s)});
const get=(a:ArmySelection,title:string)=>mechanicusIntrinsicReminders(a).filter(r=>r.title===title);
const profile=(a:ArmySelection,title:string)=>mechanicusProfileReminders(a).filter(r=>r.title.endsWith(' · '+title));
function equip(a:ArmySelection,unit:string,prefix:string,items:string[]){
 const s=a.instances!.find(s=>s.id===id(unit))!,key=(items:readonly string[])=>items.map(i=>i.toLowerCase()).sort().join('|');
 const slot=mechanicusLoadout(unit,s.models)!.slots.find(f=>f.name.startsWith(prefix)&&f.choices.some(c=>key(c.items)===key(items)));
 if(!slot)throw Error('No legal test equipment '+unit+' / '+prefix+' / '+items.join(', '));
 const knightGear={...s.knightGear,[slot.name]:slot.choices.find(c=>key(c.items)===key(items))!.name};expect(validMechanicusGear(unit,knightGear,s.models)).toBe(true);
 return {...a,instances:a.instances!.map(x=>x.id===s.id?{...x,knightGear}:x)};
}
const expected:Record<string,string>={
 'Archaeopter Fusilave':'Bomb Rack','Archaeopter Stratoraptor':'Strafing Run','Archaeopter Transvector':'Aerial Deployment',
 'Belisarius Cawl':'Canticles of the Omnissiah','Corpuscarii Electro-priests':'Electro-shock','Cybernetica Datasmith':'Data-severed',
 'Fulgurite Electro-priests':'Electro-infusion','Hastarii Exterminators':'Broad-spectrum Targeting Augurs','Hastarii Fusiliers':'Monocular Targeting Helms',
 'Ironstrider Ballistarii':'Elevated Strider','Kastelan Robots':'Repulsor Grid','Kataphron Breachers':'Breaching Command','Kataphron Destroyers':'Sentinel Directives',
 'Onager Dunecrawler':'Scuttling Walker','Pteraxii Skystalkers':'Ride the Thermals','Pteraxii Sterylizors':'Searing Conflagration','Serberys Raiders':'Tactica Obliqua',
 'Serberys Sulphurhounds':'Line-breakers','Servitor Battleclade':'Network Override','Sicarian Infiltrators':'Voices in the Code','Sicarian Ruststalkers':'Optimised Gait',
 'Skitarii Marshal':'Servo-skull Uplink','Skitarii Rangers':'Objective Scouted','Skitarii Vanguard':'Rad-saturation','Skorpius Disintegrator':'Blistering Salvoes',
 'Skorpius Dunerider':'Fire Support','Sydonian Dragoons With Radium Jezzails':'Focused Hunters','Sydonian Dragoons With Taser Lances':'Dynamic Efficiency',
 'Sydonian Skatros':'Dread Snipers','Tech-priest Dominus':'Data-spike','Tech-priest Enginseer':'Omnissiah’s Blessing','Tech-priest Manipulus':'Defend the Divine Work',
 'Technoarcheologist':'Cogitative Instincts','Thulia Ghuld':'Rod of the War Forge'
};
it.each(Object.entries(expected))('%s emits its current source-specific native ability',(unit,title)=>{
 let a=army([...new Set([unit,'Skitarii Rangers','Kataphron Breachers','Kastelan Robots','Tech-priest Dominus','Cybernetica Datasmith'])]);
 a=join(a,'Cybernetica Datasmith','Kastelan Robots');if(unit==='Fulgurite Electro-priests')a=join(a,'Tech-priest Dominus',unit);
 const rows=get(a,title);expect(rows.length).toBeGreaterThan(0);expect(rows.some(r=>r.units?.includes(id(unit)))).toBe(true);expect(rows.every(r=>r.source.includes('wh40k11ed'))).toBe(true);
 const all=mechanicusIntrinsicReminders(a);expect(new Set(all.map(r=>r.id)).size).toBe(all.length);
});
it('covers exactly the native matched roster without Legends abilities',()=>expect(Object.keys(expected).sort()).toEqual(MECHANICUS_SHEETS.map(s=>s.unit).sort()));
it('keeps legal Leader and Support effects on one identified formation and retains the living original source',()=>{
 let a=army(['Skitarii Rangers','Skitarii Rangers','Tech-priest Dominus','Skitarii Marshal']);
 expect(get(a,'Control Edict')).toEqual([]);expect(get(a,'Lord of the Machine Cult')).toEqual([]);
 a=join(join(a,'Tech-priest Dominus','Skitarii Rangers'),'Skitarii Marshal','Skitarii Rangers');
 for(const title of ['Control Edict','Lord of the Machine Cult']){
  const row=get(a,title)[0];expect(row.units).toContain(id('Skitarii Rangers'));expect(row.units).not.toContain('Skitarii Rangers#2');expect(row.summary).toContain('after the bodyguard');
 }
});
it('suppresses Hit and Critical Hit benefits during snap shots but preserves actual Wound and cover effects',()=>{
 let a=army(['Skitarii Rangers','Tech-priest Manipulus','Skitarii Marshal','Kataphron Breachers','Kataphron Destroyers','Hastarii Exterminators','Hastarii Fusiliers','Pteraxii Sterylizors','Sydonian Skatros']);
 a=join(join(a,'Tech-priest Manipulus','Skitarii Rangers'),'Skitarii Marshal','Skitarii Rangers');
 const snap=(title:string)=>get(a,title).filter(r=>r.window==='Movement'&&r.turn==='opponent');
 for(const title of ['Galvanic Field','Control Edict','Breaching Command','Broad-spectrum Targeting Augurs'])expect(snap(title)).toEqual([]);
 expect(snap('Sentinel Directives')[0].summary).toContain('unmodified 5+');expect(snap('Sentinel Directives')[0].summary).toContain('cannot re-roll Hit rolls or score Critical Hits');
 expect(snap('Monocular Targeting Helms')[0].summary).toContain('Ignores Cover');expect(snap('Searing Conflagration')[0].summary).toContain('re-roll Wound rolls');expect(snap('Achillan Eye')).toHaveLength(1);
});
it('restores normal reaction passives while preserving own-Shooting locks and physical surviving equipment',()=>{
 let a=army(['Skitarii Rangers','Skitarii Marshal','Belisarius Cawl','Pteraxii Skystalkers','Hastarii Exterminators','Sydonian Skatros'],['Eradication Cohort']);a=join(a,'Skitarii Marshal','Skitarii Rangers');
 const reaction=(title:string)=>get(a,title).filter(r=>r.window==='Shooting'&&r.turn==='opponent');
 expect(reaction('Control Edict')[0].summary).toContain('Analytic Reprisals');expect(reaction('Broad-spectrum Targeting Augurs')).toHaveLength(1);expect(reaction('Invocation of Machine Vengeance')).toHaveLength(1);
 expect(reaction('Ride the Thermals')).toEqual([]);expect(reaction('Dread Snipers')).toEqual([]);
 const gun=profile(a,'Reaction shooting · equipped models').find(r=>r.units?.includes(id('Skitarii Rangers')))!;
 expect(gun.summary).toContain('actual surviving models');expect(gun.summary).toContain('Skitarii Ranger 1 —');expect(gun.summary).not.toContain('10 ×');
 expect(profile(a,'Reaction shooting · equipped models').some(r=>r.units?.includes(id('Sydonian Skatros')))).toBe(false);
 expect(profile({...a,detachments2026:[]},'Reaction shooting · equipped models')).toEqual([]);
});
it('uses the current Cawl choices, command timing, 6-inch aura and faction target instead of an old fixed reroll aura',()=>{
 const a=army(['Belisarius Cawl','Skitarii Rangers','Callidus Assassin']);
 expect(get(a,'Canticles of the Omnissiah')[0]).toMatchObject({window:'Command',turn:'own',timing:'start'});
 expect(get(a,'Invocation of Machine Vengeance')[0].summary).toContain('selected Machine Vengeance enemy');expect(get(a,'Invocation of Machine Vengeance')[0].units).not.toContain(id('Callidus Assassin'));
 expect(get(a,'Mantra of Discipline')[0].summary).toContain('Cawl himself has Battleline');expect(get(a,'Mantra of Discipline')[0].summary).toContain('within 6″');
 expect(get(a,'Shroudpsalm')[0].summary).toContain('Benefit of Cover');expect(get(a,'Shroudpsalm')[0].summary).not.toContain('subtract 1');
});
it('chooses Thulia target immediately and limits each Icon effect to the one selected Skitarii or Thulia unit',()=>{
 const a=army(['Thulia Ghuld','Skitarii Rangers','Kataphron Breachers','Callidus Assassin']);
 const row=get(a,'Rod of the War Forge')[0];expect(row.summary).toContain('immediately select');expect(row.units).toContain(id('Skitarii Rangers'));expect(row.units).not.toContain(id('Kataphron Breachers'));expect(row.units).not.toContain(id('Callidus Assassin'));
 expect(get(a,'Icon of War')[0].summary).toContain('three alternatives');expect(get(a,'Secutor of Olympus')[0]).toMatchObject({window:'Shooting',turn:'own',timing:'start',summary:expect.stringContaining('D3+1')});
});
it('keeps Datasmith protocols on Robot models and separates their persistence from bodyguard-sourced FNP',()=>{
 let a=army(['Kastelan Robots','Cybernetica Datasmith']);a=join(a,'Cybernetica Datasmith','Kastelan Robots');
 expect(get(a,'Battle Protocols')[0]).toMatchObject({window:'Pre-battle',summary:expect.stringContaining('Aegis Protocol')});
 expect(get(a,'Battle Protocols')[1].summary).toContain('including after this Datasmith is destroyed');
 expect(get(a,'Protector Protocol').every(r=>r.summary.includes('Datasmith’s own weapons gain no attacks'))).toBe(true);
 const fnp=get(a,'Robotic Bodyguard')[0];expect(fnp.summary).toContain('only that Datasmith model');expect(fnp.summary).toContain('while an original Kastelan Robots model remains');expect(fnp.summary).toContain('until that attacking unit finishes');
 expect(get(a,'Data-severed')[0].summary).toContain('loses Vehicle and gains Infantry');
 expect(get(army(['Cybernetica Datasmith']),'Battle Protocols')).toEqual([]);
});
it('reflects mortal wounds on any unmodified save six including attached Datasmith saves and incoming return fire',()=>{
 const a=join(army(['Kastelan Robots','Cybernetica Datasmith']),'Cybernetica Datasmith','Kastelan Robots');
 const rows=get(a,'Repulsor Grid');expect(rows).toHaveLength(3);expect(rows.some(r=>r.window==='Shooting'&&r.turn==='own')).toBe(true);
 expect(rows.every(r=>r.summary.includes('any save roll')&&r.summary.includes('after it finishes shooting')&&r.summary.includes('including an attached Datasmith'))).toBe(true);
});
it('requires physical Omnispex and tether bearers and routes the currently selected gun-specific abilities',()=>{
 let a=army(['Skitarii Rangers','Onager Dunecrawler','Sydonian Skatros']);expect(get(a,'Omnispex')).toEqual([]);expect(get(a,'Enhanced Data-tether')).toEqual([]);
 a=equip(a,'Skitarii Rangers','Skitarii Ranger 1 ·',['Galvanic rifle','Omnispex']);expect(get(a,'Omnispex')[0].summary).toContain('Skitarii Ranger 1');
 a=equip(a,'Skitarii Rangers','Skitarii Ranger 1 ·',['Galvanic rifle','Enhanced data-tether']);expect(get(a,'Omnispex')).toEqual([]);expect(get(a,'Enhanced Data-tether')).toHaveLength(5);
 expect(get(a,'Broad Spectrum Data-tether')).toEqual([]);a=equip(a,'Onager Dunecrawler','',['Broad spectrum data-tether']);expect(get(a,'Broad Spectrum Data-tether')[0].summary).toContain('loses Smoke');
 a=equip(a,'Sydonian Skatros','',['Radium jezzail']);expect(get(a,'Achillan Eye')[0].summary).toContain('Infantry');expect(get(a,'Achillan Eye')[0].summary).not.toContain('Monster or Vehicle');
});
it('does not grant the Onager model-only save to attached Characters or all models just from Battleline unit membership',()=>{
 let a=army(['Onager Dunecrawler','Skitarii Rangers','Tech-priest Dominus','Belisarius Cawl']);a=join(a,'Tech-priest Dominus','Skitarii Rangers');
 const row=get(a,'Emanatus Force Field')[0];expect(row.units).toContain(id('Skitarii Rangers'));expect(row.units).not.toContain(id('Tech-priest Dominus'));
 expect(row.summary).toContain('each physical model separately');expect(row.summary).toContain('Cawl qualifies only while his Mantra');
});
it('uses the Underseer as a surviving Tech-Priest condition without assigning it to ordinary Servitors',()=>{
 const a=army(['Servitor Battleclade']);
 const row=get(a,'Network Override')[0];expect(row.summary).toContain('surviving Tech-Priest');expect(row.summary).toContain('physical Servitor Underseer');expect(row.summary).toContain('not each Combat or Gun Servitor');
});
it('keeps Transvector out of compulsory Aircraft reserves and permits only its own first Movement arrival',()=>{
 const a=army(['Archaeopter Transvector','Archaeopter Fusilave','Archaeopter Stratoraptor']);
 const rows=mechanicusProfileReminders(a),aircraft=rows.find(r=>r.title==='Aircraft · compulsory reserves')!;
 expect(aircraft.units).toEqual([id('Archaeopter Fusilave'),id('Archaeopter Stratoraptor')]);
 expect(profile(a,'Deep Strike').find(r=>r.window==='Movement')!.summary).toContain('your first Movement phase');
 const arrival=get(a,'Aerial Deployment')[0];expect(arrival.summary).toContain('does not permit first-round Rapid Ingress');
 const bomb=get(a,'Bomb Rack');expect(bomb).toHaveLength(1);expect(bomb[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end',summary:expect.stringContaining('excluding Lone Operative')});
});
it('blocks Scouts with an unqualified attached model and restores complete formation Scouts with the legal enhancement',()=>{
 let a=army(['Skitarii Rangers','Skitarii Marshal','Skorpius Dunerider'],['Skitarii Hunter Cohort']);
 expect(profile(a,'Scouts 6″')).toHaveLength(1);expect(profile(a,'Scouts · passengers')).toHaveLength(1);
 a=join(a,'Skitarii Marshal','Skitarii Rangers');expect(profile(a,'Scouts 6″')).toEqual([]);expect(profile(a,'Scouts · passengers')).toEqual([]);
 a={...a,upgrades2026:{[id('Skitarii Marshal')]:'Clandestine Infiltrator'}};
 expect(mechanicusFormationScoutRange(a,mechanicusFormations(a).find(g=>g.root.id===id('Skitarii Rangers'))!.members)).toBe(6);
 expect(profile(a,'Scouts · passengers')[0].summary).toContain('Skitarii Rangers#1 (6″)');
});
it('prints only fitting physical Firing Deck weapon choices including an attached Inquisitor',()=>{
 let a=army(['Skitarii Rangers','Inquisitor','Skorpius Dunerider','Kataphron Breachers']);a=join(a,'Inquisitor','Skitarii Rangers');
 const row=profile(a,'Firing Deck 2')[0];expect(row.units).toContain(id('Inquisitor'));expect(row.units).not.toContain(id('Kataphron Breachers'));expect(row.summary).toContain('one ranged weapon other than One Shot per selected model');
 expect(row.summary).toContain('Inquisitor#1');expect(row.summary).toContain('Skitarii Ranger');
});
it('prints complete equipped profiles, omits snap Ballistic Skill and keeps native saves in every incoming attack window',()=>{
 const a=army(['Skitarii Rangers','Sydonian Skatros']);
 const normal=profile(a,'Ranged weapon profiles').find(r=>r.units?.includes(id('Skitarii Rangers'))&&r.window==='Shooting')!;
 expect(normal.summary).toContain('A 2; BS 4+; D 1');expect(normal.summary).toContain('30″');
 const snap=profile(a,'Ranged weapon profiles').find(r=>r.units?.includes(id('Skitarii Rangers'))&&r.window==='Movement')!;expect(snap.summary).not.toContain('BS ');
 expect(profile(a,'Invulnerable save').filter(r=>r.units?.includes(id('Skitarii Rangers')))).toHaveLength(5);
 expect(profile(a,'Stealth').filter(r=>r.units?.includes(id('Sydonian Skatros')))).toHaveLength(4);expect(profile(a,'Lone Operative')).toHaveLength(4);
 const rows=mechanicusProfileReminders(a);expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);expect(mechanicusIntrinsicReminders({...a,faction:'Necrons'})).toEqual([]);
});
