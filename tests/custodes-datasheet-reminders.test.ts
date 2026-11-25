import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {generate11thReminders} from '../src/reminders-11th';
import {KNIGHT_CARD_STATS as cards} from '../src/custodes-card-data.generated';
import {knightLoadoutFor,knightWeaponCount,validKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';
const s=(unit:string,id=unit):RosterInstance=>({unit,id});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('Adeptus Custodes'),instances});
const rules=(...s:RosterInstance[])=>generate11thReminders(army(...s)).filter(r=>r.id.startsWith('11e-custodes-card:'));
const named=(r:ReturnType<typeof rules>,n:string)=>r.filter(x=>x.title.endsWith(' · '+n));

describe('Custodes weapon choices, marked enemies and bodyguard formations',()=>{
 it.each(Object.keys(cards))('%s maps every printed weapon to a legal kit and produces exactly the fitted mode or keyword summary',unit=>{
   let configs=[s(unit)];
   for(const sl of knightLoadoutFor('Adeptus Custodes',unit)!.slots)configs=configs.flatMap(squad=>sl.choices.map(choice=>({...squad,knightGear:{...squad.knightGear,[sl.name]:choice.name}})));
   configs=configs.filter(squad=>validKnightGear(squad,'Adeptus Custodes'));
   for(const weapon of cards[unit].weapons){
     const eq=configs.find(squad=>knightWeaponCount(squad,weapon.name));
     expect(eq,'Printed profile has no legal bearer: '+weapon.name).toBeDefined();
     if(!weapon.mode&&!weapon.abilities.length)continue;
     const sheet=(squad:RosterInstance)=>named(rules(squad),weapon.phase==='Fight'?'Melee weapon profiles':'Ranged weapon profiles').find(r=>r.window===weapon.phase)?.summary??'';
     expect(sheet(eq!)).toContain('× '+weapon.name);
     const absent=configs.find(squad=>!knightWeaponCount(squad,weapon.name));
     if(absent)expect(sheet(absent)).not.toContain('× '+weapon.name);
   }
 });
 const namedCases=[
   ['Shield-Captain in Allarus Terminator Armour','Archeotech Teleport-shunter','Movement','own','must make an ingress move this phase'],
   ['Shield-Captain on Dawneagle Jetbike','Sweeping Advance','Fight','either','Fall Back move if engaged'],
   ['Custodian Wardens','Living Fortress','Shooting','opponent','Worsen the AP'],
   ['Allarus Custodians','Slayer of Tyrants','Fight','either','greater Toughness'],
   ['Vertus Praetors','Quicksilver Execution','Fight','either','Sustained Hits 1'],
   ['Contemptor-Achillus Dreadnought','Unyielding Ancient','Movement','own','Strength exceeds'],
   ['Contemptor-Galatus Dreadnought','Unyielding Ancient','Fight','either','Strength exceeds'],
   ['Coronus Grav-Carrier','Repulsor Suspensor Technology','Shooting','opponent','lost a wound'],
   ['Telemon Heavy Dreadnought','Guardian Eternal','Movement','own','Damage of ranged attacks'],
   ['Pallas Grav-Attack','Mobile Hunter','Shooting','own','cannot declare a charge'],
   ['Knight-Centura','Corner the Quarry','Movement','either','Battle-shocked'],
   ['Custodian Guard Sodality','Impenetrable Defence','Fight','either','either this formation or the target'],
   ['Prosecutor Squad','Purity of Execution','Shooting','own','detection range increases by 3″'],
   ['Aquilon Terminators with Solarite Power Gauntlets','Dread Foe','Fight','either','neither a Monster nor a Vehicle'],
   ['Sentinel Guard Sodality','Stand Vigil','Fight','either','Lethal Hits'],
   ['Gyrfalcon Jetbike Sodality','Death Blow','Fight','either','melee AP by 1'],
   ['Vigilator Squad','Deft Parry','Fight','either','melee attacks targeting this formation'],
   ['Aquilon Terminators with Solarite Power Talons','Reap a Terrible Tally','Movement','opponent','cannot re-roll Hit rolls'],
   ['Caladius Annihilator Grav-Tank','Advanced Firepower','Movement','opponent','one Wound roll and one Damage roll'],
 ];
 it.each(namedCases)('%s activates %s in the printed phase and turn',(unit,title,phase,turn,text)=>{
    const cue=named(rules(s(unit,'unit')),title).find(r=>r.window===phase&&r.turn===turn);
    expect(cue?.summary).toContain(text);expect(cue?.units).toEqual(['unit']);
 });
 it('renders the numeric and target-qualified October weapon keywords rather than just their names',()=>{
    const tank=rules(s('Caladius Grav-Tank'));
    const shooting=named(tank,'Ranged weapon profiles').find(r=>r.window==='Shooting')!.summary;
    expect(shooting).toContain('against a target with neither Monster nor Vehicle, each critical hit scores one extra hit');
    expect(named(tank,'Ranged weapon profiles').find(r=>r.window==='Movement')!.summary).not.toContain('Sustained Hits');
    const venom=rules(s('Venatari with Kinetic Destroyers'));
    expect(named(venom,'Ranged weapon profiles').find(r=>r.window==='Shooting')?.summary).toContain('use close-quarters shooting against an engaged target');
    const telemon=rules(s('Telemon Heavy Dreadnought'));
    expect(named(telemon,'Ranged weapon profiles').find(r=>r.window==='Shooting')?.summary).toContain('add 2 attack dice per five models');
    expect(named(rules(s('Trajann Valoris')),'Melee weapon profiles')[0].summary).toContain('all this weapon’s attacks target the same unit');
 });
 it('keeps bearer-specific shields distinct from Sentinel formation protection and optional vexilla',()=>{
   const c=s('Shield-Captain','c'),sent=s('Sentinel Guard Sodality','b');
   const joined={...c,attachedTo:'b'},v={...sent,knightGear:{Vexilla:'Vexilla'}};
   const rows=rules(joined,v);
   const guard=named(rows,'Praesidium Shield').filter(r=>r.title.startsWith('b ·'));
   const cap=named(rows,'Praesidium Shield').filter(r=>r.title.startsWith('c ·'));
   expect(guard[0]).toMatchObject({units:['b']}); expect(guard[0].summary).toContain('Strength exceeds');
   expect(cap[0]).toMatchObject({units:['c']}); expect(cap[0].summary).toContain('allocated to this Shield-Captain');
   expect(named(rows,'Vexilla')[0]).toMatchObject({units:['b']});
   expect(named(rules(sent),'Vexilla')).toEqual([]);
   expect(named(rules({...c,knightGear:{Weapons:'Castellan Axe'}}),'Praesidium Shield')).toEqual([]);
   expect(named(rows,'Master of Ka’tahs')[0].units).toEqual(['b']);
   expect(named(rows,'Vengeful Surge')[0].summary).toMatch(/lost a wound.*D6\+2″.*unengaged/);
 });
 it('gives an army-wide Rapid Ingress discount once while the two Venatari formations retain their own mines and arrival conditions',()=>{
   const r=rules(s('Venatari with Verutum Lances','v1'),s('Venatari with Verutum Lances','v2'),s('Venatari with Kinetic Destroyers','k'));
   expect(named(r,'Swift Ruin')).toHaveLength(1);
   expect(named(r,'Swift Ruin')[0]).toMatchObject({units:['v1','v2'],turn:'opponent',window:'Movement',timing:'end'});
   expect(named(r,'Swift Ruin')[0].summary).toContain('first-round prohibition');
   expect(named(r,'Neutronium Cascade Mine').filter(r=>r.window==='Shooting')).toHaveLength(3);
   expect(named(r,'Strike from the Skies')[0]).toMatchObject({units:['k'],window:'Shooting',turn:'own'});
   expect(named(r,'Take Wing').every(r=>r.window==='Fight'&&r.turn==='opponent'&&r.timing==='end')).toBe(true);
 });
 it('places the Blade Champion mark at the first round boundary, keeps its bonus off its bodyguard, and restricts auras to the correct model and weapon type',()=>{
   const rows=rules(s('Custodian Guard Sodality','body'),{...s('Blade Champion','champ'),attachedTo:'body'},s('Trajann Valoris','tr'),s('Caladius Grav-Tank','tank'),s('Vigilator Squad','melee'));
   expect(named(rows,'Sword of the Throne').find(r=>r.window==='Start of battle round')).toMatchObject({timing:'start',units:['champ']});
   expect(named(rows,'Sword of the Throne').find(r=>r.window==='Fight')?.summary).toContain('own attacks');
   const aura=named(rows,'Captain-General (Aura)');
   expect(aura.find(r=>r.window==='Shooting')?.units).toEqual(['body','tr']);
   expect(aura.find(r=>r.window==='Fight')?.units).toEqual(['body','tr','melee']);
   expect(aura.find(r=>r.window==='Movement')?.summary).toMatch(/re-roll Wound rolls of 1.*cannot be re-rolled/);
 });
 it('distinguishes an Ares Aircraft’s reserve restrictions from the Orion Hover model, and restricts post-ingress attacks by phase',()=>{
   const r=rules(s('Ares Gunship','a'),s('Orion Assault Dropship','o'));
   expect(named(r,'Aircraft · return to reserves')[0]).toMatchObject({units:['a'],window:'End of opponent turn',turn:'opponent',timing:'end'});
   expect(named(r,'Hover')[0].units).toEqual(['o']);
   expect(named(r,'Infernus Firebombs')[0].summary).toMatch(/Lone Operatives.*one D6 per model.*capped at six/);
   expect(named(r,'Infernus Firebombs')[0]).toMatchObject({window:'Fight',turn:'opponent',timing:'end'});
 });
 it('uses only legally loadable formations, lists actual embarked guns on the firing deck and excludes an empty or melee-only Rhino',()=>{
   const rhino=s('Anathema Psykana Rhino','r'),sisters=s('Witchseeker Squad','w'),blades=s('Vigilator Squad','b'),guard=s('Custodian Guard Sodality','g'),venatari=s('Venatari with Verutum Lances','jet');
   expect(named(rules(rhino,guard),'Assault Vehicle')).toEqual([]);
   expect(named(rules(rhino,blades),'Firing Deck 2')).toEqual([]);
   const loaded=rules(rhino,sisters,blades,guard);
   expect(named(loaded,'Assault Vehicle')[0].units).toEqual(['w','b']);
   expect(named(loaded,'Assault Vehicle')[0].summary).toMatch(/wholly within 3″.*cannot charge/);
   const deck=named(loaded,'Firing Deck 2')[0];expect(deck.units).toEqual(['r','w']);
   expect(deck.summary).toMatch(/up to two embarked models.*One Shot.*w \(Flamer\)/);
   expect(named(rules(s('Coronus Grav-Carrier'),venatari),'Assault Vehicle')).toEqual([]);
   expect(named(rules(s('Orion Assault Dropship'),guard),'Assault Dropship')[0]).toMatchObject({units:['g'],window:'Movement',turn:'own'});
   expect(named(rules(s('Orion Assault Dropship')),'Assault Dropship')).toEqual([]);
 });
 it('computes a realistic 1,000-point mixed Custodes force and distinguishes embarked Sisters, Trajann’s formation and the tank',()=>{
   const rows=[s('Trajann Valoris','tr'),s('Custodian Guard Sodality','guard'),s('Caladius Grav-Tank','tank'),s('Pallas Grav-Attack','pallas'),s('Anathema Psykana Rhino','rhino'),{...s('Witchseeker Squad','sisters'),models:5}];rows[0].attachedTo='guard';
   const configuration={...army(...rows),battleSize2026:'Incursion' as const,warlordId:'tr'};
   expect(rosterCost2026(configuration).total).toBe(1000);
   const generated=generate11thReminders(configuration);
   expect(named(generated,'Deep Strike').filter(r=>r.window==='Pre-battle'&&r.units?.includes('guard'))).toHaveLength(1);
   expect(named(generated,'Sanctified Flames')[0].units).toEqual(['sisters']);
   expect(named(generated,'Sanctified Flames')[0].summary).toMatch(/−1.*Psyker/);
   expect(named(generated,'Destructor Optics')[0].summary).toContain('neither a Monster nor a Vehicle');
   expect(named(generated,'Moment Shackle')[0].units).toEqual(['tr']);
   expect(named(generated,'Captain-General (Aura)').find(x=>x.window==='Shooting')?.units).toEqual(['guard','sisters']);
 });
});
