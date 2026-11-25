import {describe,expect,it} from 'vitest';
import {generate11thReminders} from '../src/reminders-11th';
import {newSelection} from '../src/catalog';
import type {ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {chaosKnightDatasheetReminders,chaosKnightHasRangedWeapon} from '../src/chaos-knight-datasheets';
import {KNIGHT_CARD_STATS} from '../src/chaos-knight-weapon-data.generated';
import {knightLoadoutFor,knightWeaponCount,validKnightGear} from '../src/knight-loadouts';

const squad=(unit:string,id=unit):RosterInstance=>({unit,id});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Chaos Knights'),instances,detachments2026:['Iconoclast Fiefdom']});
function rules(...instances:RosterInstance[]){return generate11thReminders(army(...instances)).filter(r=>r.id.startsWith('11e-chaos-knight-card:'))}
const named=(rows:ReturnType<typeof rules>,title:string)=>rows.filter(r=>r.title.endsWith(' · '+title));
type AuraCase=[string,string,string,string,number];
const auras:AuraCase[]=[
 ['Chaos Cerastus Knight Acheron','Unrestrained Terror','Fight','one Battle-shock test',6],
 ['Chaos Cerastus Knight Lancer','Dark Fervour','Shooting','Assault',6],
 ['Chaos Cerastus Knight Castigator','Offerings for the Dark Gods','Shooting','Sustained Hits 1',6],
 ['Chaos Cerastus Knight Atrapos','Consumed with Hunger','Fight','Titanic or Towering',6],
 ['Chaos Questoris Knight Magaera','Huntmaster','Movement','after an Advance',6],
 ['Chaos Questoris Knight Styrix','Preysight','Movement','Ignores Cover',6],
 ['Knight Despoiler','Dread Dominion','Command','Leadership and OC by 1',9],
 ['Knight Tyrant','Infernal Aegis','Shooting','Benefit of Cover',6],
 ['Knight Desecrator','Taskmaster','Shooting','ranged Hit rolls of 1',9],
 ['Knight Rampager','Frenzied Rampage','Fight','melee Hit rolls of 1',9],
 ['Knight Ruinator','Close-range Killers','Fight','closest eligible target',9],
];

describe('War Dog auras and their detachment interactions',()=>{
 it.each(auras)('%s applies %s to nearby actual War Dogs in %s',(unit,title,window,summary,distance)=>{
   const model=squad(unit,'giver'),dog=squad('War Dog Executioner','dog'),other=squad('Knight Desecrator','other'),ally=squad('Traitor Guardsmen Squad','guard');
   const get=(r:ReturnType<typeof rules>)=>named(r,title+' (Aura)').filter(r=>r.title.startsWith('giver ·'));
   expect(get(rules(model,other,ally))).toEqual([]);
   const res=get(rules(model,dog,other,ally));
   expect(res.every(r=>r.units?.join()==='dog'&&r.summary.includes(distance+'″'))).toBe(true);
   expect(res.find(r=>r.window===window)?.summary).toContain(summary);
 });
 it('Helhunt extends the actual aura to its giver with two War Dogs and grants it to the specifically selected other Character with the Throne',()=>{
   const giver=squad('Knight Desecrator','giver'),dog=squad('War Dog Executioner','a'),second=squad('War Dog Huntsman','b'),target=squad('Knight Ruinator','recipient'),excluded=squad('Chaos Acastus Knight Porphyrion','other');
   const r=(...units:RosterInstance[])=>named(chaosKnightDatasheetReminders({...army(...units),detachments2026:['Helhunt Lance'],upgrades2026:{giver:'Throne Tyrannicus'}},units),'Taskmaster (Aura)')[0];
   expect(r(giver,target,excluded)?.units).toEqual(['recipient']);
   expect(r(giver,dog,target)?.units).toEqual(['a','recipient']);
   expect(r(giver,dog,second,target,excluded)?.units).toEqual(['a','b','giver','recipient']);
   expect(r(giver,dog,second,target)?.summary).toMatch(/two War Dogs.*also applies it to giver.*within 9″/);
 });
});

describe('datasheet timing, target restrictions and reaction profiles',()=>{
 const personalCases=[
   ['Chaos Cerastus Knight Acheron','Searing Flames','Shooting','one enemy hit by its Acheron flame cannon'],
   ['Chaos Cerastus Knight Lancer','Shock Charge','Charge','Crushing Impact on it for 0 CP'],
   ['Chaos Cerastus Knight Castigator','Storm of Bolts','Shooting','neither a Monster nor a Vehicle'],
   ['Chaos Cerastus Knight Atrapos','Macro-extinction Protocols','Fight','also Titanic or Towering'],
   ['Chaos Questoris Knight Magaera','Repair Auto-simulacra','Command','D3 lost wounds'],
   ['Chaos Acastus Knight Porphyrion','Bastion of Firepower','Movement','Remains Stationary'],
   ['Chaos Acastus Knight Asterius','Sunderer of Fortresses','Fight','Against a Fortification, increase both by 2'],
   ['Knight Despoiler','Seething Hatred','Fight','one Hit roll or one Wound roll'],
   ['Knight Tyrant','Bastion of Corruption','Movement','cannot be set up within 12″'],
   ['Knight Rampager','Bloodlust','Fight','makes a Charge move'],
   ['War Dog Moirax','Protection Protocols','Charge','1 CP less'],
   ['War Dog Stalker','Stalker','Fight','no other unit from its army within 6″'],
   ['War Dog Karnivore','Karnivore','Charge','Advance rolls and Charge rolls'],
   ['War Dog Brigand','Brigand','Movement','objective marker gain Ignores Cover'],
   ['War Dog Huntsman','Huntsman','Movement','re-roll Wound rolls against Monster or Vehicle'],
   ['Cultist Firebrand','Cursed Flames','Shooting','one enemy Infantry unit it hit'],
   ['Cultist Mob','For the Dark Gods','Command','opponent’s Level of Control exceeds yours'],
   ['Traitor Guardsmen Squad','Twisted Defence Force','Shooting','Save characteristic by 1'],
 ];
 it.each(personalCases)('%s places %s in %s with its printed trigger',(unit,title,window,summary)=>{
   const actual=named(rules(squad(unit)),title).find(r=>r.window===window);
   expect(actual?.summary).toContain(summary);
   expect(actual?.units).toEqual([unit]);
   expect(named(rules(squad('War Dog Huntsman','other')).filter(r=>r.title.startsWith(unit+' · ')),title)).toEqual([]);
 });
 it('applies the amended Abominant storm once per target across overlapping 9″ ranges and gives each model its own psychic target choice',()=>{
   const r=rules(squad('Knight Abominant','a'),squad('Knight Abominant','b'));
   expect(named(r,'Warp Storms (Psychic)')).toHaveLength(1);
   expect(named(r,'Warp Storms (Psychic)')[0]).toMatchObject({timing:'end',turn:'own',window:'Movement',units:['a','b']});
   expect(named(r,'Vortex Terrors (Psychic)')).toHaveLength(2);
   expect(named(r,'Vortex Terrors (Psychic)')[0]).toMatchObject({timing:'start',turn:'own',window:'Shooting'});
   expect(named(r,'Ranged weapon profiles')[0].summary).toMatch(/Volkite combustor.*Ignores Cover.*Devastating Wounds/);
 });
 it('uses the amended monster/vehicle restriction on the laser destructor, target-specific BS and attack modifiers, and distinguishes eligible out-of-turn guns',()=>{
   const r=rules(squad('Knight Desecrator'));
   expect(named(r,'Ranged weapon profiles').every(r=>r.window==='Shooting')).toBe(true);
   expect(named(r,'Ranged weapon profiles')[0].summary).toContain('against a Monster or Vehicle only');
   expect(named(r,'Obsessive Ruthlessness')[0].summary).toMatch(/Monster or Vehicle.*Ballistic Skill, Hit rolls and Wound rolls/);
   const x=rules(squad('War Dog Executioner'));
   expect(named(x,'Executioner').find(r=>r.window==='Movement')).toMatchObject({timing:'end',turn:'opponent'});
   expect(named(x,'Executioner').find(r=>r.window==='Movement')?.summary).not.toContain('add 1 to Hit');
   expect(named(x,'Executioner').find(r=>r.window==='Movement')?.summary).toMatch(/3″.*before/);
 });
 it('uses the Styrix fixed graviton crusher across both legal arm options and differentiates the Moirax and Asterius Conversion thresholds',()=>{
   const styrix=squad('Chaos Questoris Knight Styrix'),slot=knightLoadoutFor('Chaos Knights',styrix.unit)!.slots[0];
   const family=slot.choices.map(c=>({...styrix,knightGear:{[slot.name]:c.name}}));
   expect(family).toHaveLength(2);
   expect(named(rules(squad('Chaos Questoris Knight Magaera')),'Grav-pinned')).toEqual([]);
   for(const s of family)expect(named(rules(s),'Grav-pinned').length).toBe(knightWeaponCount(s,'Graviton crusher')?1:0);
   const moirax=squad('War Dog Moirax'),arm=knightLoadoutFor('Chaos Knights',moirax.unit)!.slots[0];
   const fitted={...moirax,knightGear:{[arm.name]:'Conversion beam cannon'}};
   expect(named(rules(fitted),'Ranged weapon profiles').find(r=>r.window==='Shooting')?.summary).toContain('more than 12″');
   expect(named(rules(fitted),'Ranged weapon profiles').find(r=>r.window==='Movement')?.summary).not.toContain('more than 12″');
   expect(named(rules(squad('Chaos Acastus Knight Asterius')),'Ranged weapon profiles')[0].summary).toContain('more than 24″');
 });
 it('keeps each save allocation, damage bracket, explosion and new victim selection on the right model',()=>{
   const lancer=rules(squad('Chaos Cerastus Knight Lancer'));
   expect(named(lancer,'Invulnerable save').find(r=>r.window==='Fight')?.summary).toContain('4+');
   const dog=rules(squad('War Dog Moirax'));
   expect(named(dog,'Invulnerable save').some(r=>r.window==='Fight')).toBe(false);
   expect(named(dog,'Damaged')[0].summary).toMatch(/1–5.*subtract 3.*and 1 from its Hit/);
   expect(named(dog,'Deadly Demise D3')[0].summary).toMatch(/On a 6.*within 6″.*D3/);
   const r=rules(squad('Knight Ruinator'));
   expect(named(r,'Methodical Destruction').find(r=>r.window==='Start of battle round'&&r.timing==='start')?.summary).toContain('first battle round');
   expect(named(r,'Methodical Destruction').find(r=>r.window==='Fight')?.summary).toContain('Re-roll');
   expect(named(r,'Methodical Destruction · new victim').find(r=>r.window==='Command')?.summary).toContain('destroyed');
 });
});

describe('Iconoclast allied formations use their printed model and army restrictions',()=>{
 it('keeps all seven allies out of other detachments and omits Chaos Icon and Dark Pacts when the army faction is Chaos Knights',()=>{
   const units=['Dark Commune','Cultist Firebrand','Traitor Enforcer','Traitor Guardsmen Squad','Fellgor Beastmen','Accursed Cultists','Cultist Mob'].map(n=>squad(n));
   expect(chaosKnightDatasheetReminders({...army(...units),detachments2026:['Infernal Lance']},units)).toEqual([]);
   expect(rules(...units).filter(r=>/Dark Pacts|Chaos Icon/.test(r.title))).toEqual([]);
   expect(named(rules(squad('Fellgor Beastmen')),'Bestial Raiders').find(r=>r.window==='Movement')?.summary).toMatch(/first, second or third.*one higher/);
 });
 it('applies Dark Ritual to the formation, with a surviving Demagogue, and keeps the defensive save conditional on leading',()=>{
   const body=squad('Accursed Cultists','body'),commune=squad('Dark Commune','c'),alone=rules(body,commune);
   expect(named(alone,'Faithful Flock')).toEqual([]);
   expect(named(alone,'Dark Ritual')[0].units).toEqual(['c']);
   expect(named(alone,'Scouts 6″')).toHaveLength(1);
   const joined=rules(body,{...commune,attachedTo:'body'});
   expect(named(joined,'Scouts 6″')).toEqual([]);
   expect(named(joined,'Faithful Flock').every(r=>r.units?.join()==='body'&&/Cult Demagogue is alive.*5\+/.test(r.summary))).toBe(true);
   expect(named(joined,'Dark Ritual')[0]).toMatchObject({window:'Command',turn:'own',units:['body']});
   expect(named(joined,'Dark Ritual')[0].summary).toMatch(/Once per battle.*body may charge.*Hit and Wound/);
   expect(named(joined,'Feel No Pain 6+')[0].summary).toMatch(/Accursed Cultists model.*Mutants and Torments/);
   expect(named(joined,'Howling Horde')[0]).toMatchObject({window:'Shooting',turn:'opponent'});
 });
 it('offers the Enforcer reaction only for a legal attachment, with actual bodyguard casualty and Ogre-dependent model-only protection',()=>{
   const e=squad('Traitor Enforcer','e'),guard=squad('Traitor Guardsmen Squad','g');
   expect(named(rules(e,guard),'Brutal Example')).toEqual([]);
   expect(named(rules({...e,attachedTo:'g'},squad('Cultist Mob','g')),'Brutal Example')).toEqual([]);
   const r=rules({...e,attachedTo:'g'},guard);
   expect(named(r,'Brutal Example')[0]).toMatchObject({window:'Movement',timing:'end',turn:'opponent',units:['g']});
   expect(named(r,'Brutal Example')[0].summary).toMatch(/0 CP.*Destroy one of its Bodyguard models/);
   expect(named(r,'Invulnerable save')[0].summary).toContain('Traitor Enforcer model only');
   expect(named(r,'Mutated Bodyguard')[0].summary).toMatch(/Ogryn survives.*Character models.*4\+/);
   expect(named(r,'Melee weapon profiles').some(r=>/Power fist.*choose one profile/.test(r.summary))).toBe(false);
   expect(named(rules({...squad('Cultist Firebrand','fire'),attachedTo:'c'},squad('Cultist Mob','c')),'Fiery Faith')[0].units).toEqual(['c']);
 });
});

describe('matched Chaos weapon selections',()=>{
 it.each(Object.keys(KNIGHT_CARD_STATS))('%s resolves all printed profiles to an equipped weapon and the right phase',unit=>{
   let configs:RosterInstance[]=[squad(unit)];
   for(const sl of knightLoadoutFor('Chaos Knights',unit)!.slots)configs=configs.flatMap(s=>sl.choices.map(c=>({...s,knightGear:{...s.knightGear,[sl.name]:c.name}})));
   configs=configs.filter(s=>validKnightGear(s,'Chaos Knights'));
   for(const profile of KNIGHT_CARD_STATS[unit].weapons){
     const armed=configs.find(s=>knightWeaponCount(s,profile.name)>0);
     expect(armed,'Unreachable printed profile '+profile.name).toBeDefined();
     if(profile.phase==='Shooting')expect(chaosKnightHasRangedWeapon(armed!)).toBe(true);
     if(!profile.mode&&!profile.abilities.length)continue;
     const text=(s:RosterInstance)=>named(rules(s),profile.phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles').find(r=>r.window===profile.phase)?.summary??'';
     expect(text(armed!)).toContain('× '+profile.name);
     const unarmed=configs.find(s=>!knightWeaponCount(s,profile.name));
     if(unarmed)expect(text(unarmed)).not.toContain('× '+profile.name);
   }
 });
});
