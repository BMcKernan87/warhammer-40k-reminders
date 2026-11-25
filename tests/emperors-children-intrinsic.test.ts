// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026} from '../src/datasheets-2026';
import {emperorsChildrenLoadout} from '../src/emperors-children-loadouts';
import {emperorsChildrenIntrinsicReminders as cards} from '../src/emperors-children-intrinsic';
import {emperorsChildrenMusterFindings} from '../src/emperors-children-muster';
import {setKnightGear} from '../src/knight-loadouts';
import type {RosterInstance} from '../src/roster-instances';
const id=(name:string)=>name+'#1';
const s=(unit:string,models?:number):RosterInstance=>({unit,id:id(unit),models});
const lead=(unit:string,body:string)=>({...s(unit),attachedTo:id(body)});
function build(instances:RosterInstance[],detachment='Mercurial Host',size:ArmySelection['battleSize2026']='Incursion'):ArmySelection{
 const units:Record<string,number>={};
 for(const member of instances)units[member.unit]=(units[member.unit]??0)+1;
 return {...newSelection('Emperor’s Children'),detachments2026:[detachment],battleSize2026:size,instances,units};
}
const find=(army:ArmySelection,title:string)=>cards(army).filter(r=>r.title===title);
function equip(army:ArmySelection,unit:string,item:string){
 const member=army.instances!.find(m=>m.unit===unit)!,field=emperorsChildrenLoadout(unit,member.models)!.slots.find(slot=>slot.choices.some(c=>c.items.includes(item)));
 const choice=field?.choices.find(c=>c.items.includes(item));
 if(!field||!choice)throw Error(unit+' lacks '+item);
 return setKnightGear(army,member.id,field.name,choice.name);
}
it('reopens an exact 1,000-point three-Leader army with the correct host-specific rules, phase limits and shared transport',()=>{
 let a=build([lead('Lord Exultant','Tormentors'),s('Tormentors'),s('Noise Marines'),lead('Lord Kakophonist','Noise Marines'),s('Chaos Rhino'),s('Flawless Blades'),lead('Lucius the Eternal','Flawless Blades'),s('Maulerfiend'),s('Heldrake')]);
 a={...a,warlordId:id('Lord Exultant')};
 expect(rosterCost2026(a).total).toBe(1000);expect(emperorsChildrenMusterFindings(a)).toEqual([]);
 const r=cards(JSON.parse(JSON.stringify(a)));
 expect(r.find(c=>c.title==='Perfectionists'&&c.window==='Fight')?.units).toEqual([id('Lord Exultant'),id('Tormentors')]);
 expect(r.find(c=>c.title==='Euphoric Strikes')).toMatchObject({window:'Fight',timing:'start',units:[id('Lord Exultant')],summary:expect.stringMatching(/Once per battle.*3 Attacks.*AP by 1/)});
 expect(r.find(c=>c.title==='Obsessive Annunciation')?.units).toEqual([id('Lord Kakophonist'),id('Noise Marines')]);
 expect(r.find(c=>c.title==='Doom Siren')?.summary).toMatch(/Infantry.*any of those attacks.*three D6.*4\+.*Battle-shock/);
 expect(r.find(c=>c.title==='Duellist’s Hubris')).toBeUndefined();
 expect(r.find(c=>c.title==='A Challenge Worthy of Skill')?.units).toEqual([id('Lucius the Eternal')]);
 const patrons=r.filter(c=>c.title==='Daemonic Patrons');
 expect(patrons.map(c=>[c.window,c.turn,c.timing])).toEqual([['Fight','either','during'],['Fight','either','end']]);
 expect(patrons[1].summary).toMatch(/no enemy models.*destroy one model/);
 expect(r.find(c=>c.title==='Assault Vehicle')?.summary).toMatch(/Advances.*3″.*cannot charge/);
 expect(r.find(c=>c.title==='Assault Vehicle')?.units).toContain(id('Tormentors'));
 expect(r.find(c=>c.title==='Terrifying Crescendo')?.summary).toMatch(/Leadership tests.*next Shooting phase.*Each application stacks/);
 expect(r.find(c=>c.title==='Airborne Predator')?.summary).toMatch(/Normal move.*two D6.*Fly.*D3 mortal/);
 expect(new Set(r.map(c=>c.id)).size).toBe(r.length);
});
it('keeps a 2,000-point Carnival roster’s five Legions of Excess datasheets separate from native units with the same patron',()=>{
 let a=build([s('Fulgrim'),s('Keeper of Secrets'),s('Shalaxi Helbane'),s('Daemonettes'),s('Fiends'),s('Seekers'),s('Chaos Land Raider'),s('Chaos Terminators'),lead('Lord Kakophonist','Chaos Terminators'),lead('Lord Exultant','Tormentors'),s('Tormentors'),s('Flawless Blades',6)],'Carnival of Excess','Strike Force');
 a={...a,warlordId:id('Fulgrim')};
 expect(rosterCost2026(a).total).toBe(2000);expect(emperorsChildrenMusterFindings(a)).toEqual([]);
 const r=cards(a),aura=r.find(c=>c.title==='Daemon Lord of Slaanesh');
 expect(aura?.units).toEqual(['Keeper of Secrets#1','Shalaxi Helbane#1','Daemonettes#1','Fiends#1','Seekers#1']);
 expect(aura?.units).not.toContain(id('Tormentors'));
 expect(r.find(c=>c.title==='Monarch of the Hunt')).toMatchObject({window:'Start of battle round',timing:'start',summary:expect.stringMatching(/first battle round.*new enemy/)});
 expect(r.find(c=>c.title==='Horrifying Beauty')).toMatchObject({window:'Fight',turn:'either',timing:'start',summary:expect.stringMatching(/one Battle-shock test.*below Half-strength/)});
 expect(r.find(c=>c.title==='Soporific Musk')?.summary).toMatch(/Monster or Vehicle.*subtract 1/);
 expect(r.find(c=>c.title==='Assault Ramp')?.units).toContain(id('Chaos Terminators'));
 expect(r.find(c=>c.title==='Assault Ramp')?.units).not.toContain(id('Daemonettes'));
 expect(r.find(c=>c.title==='Lethal Obsession'&&c.window==='Shooting')?.summary).toMatch(/hit.*re-roll.*engaged with that marked enemy/);
 expect(find({...a,detachments2026:['Mercurial Host']},'Daemon Lord of Slaanesh')).toEqual([]);
 expect(find(a,'No Prey Can Evade').map(c=>c.window)).toEqual(['Movement','Charge']);
 expect(find(a,'Unholy Speed').map(c=>c.window)).toEqual(['Movement','Charge']);
});
it('keeps Fulgrim’s opponent-Command choice distinct from both players’ permanent Poison trigger and his optional defensive presence',()=>{
 const a=build([s('Fulgrim')]);
 expect(find(a,'Daemon Primarch of Slaanesh')).toMatchObject([{window:'Command',turn:'opponent',timing:'start'}]);
 expect(find(a,'Daemonic Poisons').map(r=>[r.window,r.turn,r.timing])).toEqual([['Shooting','own','during'],['Fight','either','during'],['Command','either','start']]);
 expect(find(a,'Daemonic Poisons')[2].summary).toMatch(/per poisoned enemy unit on the battlefield.*destroyed.*4\+.*D3/);
 expect(find(a,'Beguiling Form').every(r=>r.summary.includes('If this presence was selected'))).toBe(true);
 expect(find(a,'Enthralling Hypnosis')[0]).toMatchObject({window:'Movement',turn:'opponent',summary:expect.stringMatching(/6″.*Fall Back.*Leadership.*Remain Stationary/)});
 expect(find(a,'Daemonic Speed')[0].window).toBe('Fight');
});
it('resolves actual equipped gear, named prince variants and conditional army-wide auras',()=>{
 const ordinary=build([s('Daemon Prince of Slaanesh'),s('Daemon Prince of Slaanesh with Wings'),s('Keeper of Secrets'),s('Infractors'),s('Daemonettes'),s('Seekers'),s('Maulerfiend')],'Carnival of Excess','Strike Force');
 expect(find(ordinary,'Lord of Excess')[0].units).toEqual([id('Daemon Prince of Slaanesh'),id('Infractors'),id('Daemonettes')]);
 expect(find(ordinary,'Excessive Vigour')[0].units).toContain(id('Keeper of Secrets'));
 expect(find(ordinary,'Ecstatic Death')[0].summary).toMatch(/melee attack.*before it has fought.*2\+.*then remove/);
 expect(find(ordinary,'Daemonic Destruction')[0].summary).toMatch(/one D6 per remaining wound.*six mortal wounds/);
 expect(find(ordinary,'Stimulated by Pain')[0].units).toEqual([id('Daemon Prince of Slaanesh with Wings')]);
 expect(find(ordinary,'Shining Aegis')).toEqual([]);expect(find(ordinary,'Daemonic Icon')).toEqual([]);
 const shield=equip(ordinary,'Keeper of Secrets','Shining aegis');
 expect(find(shield,'Shining Aegis')[0].summary).toContain('3+ armour Save');
 const symbols=equip(equip(ordinary,'Infractors','Icon of Excess'),'Seekers','Instrument of Chaos');
 expect(find(symbols,'Icon of Excess').map(r=>[r.window,r.turn,r.timing])).toEqual([['Shooting','own','end'],['Fight','either','end']]);
 expect(find(symbols,'Instrument of Chaos')[0].units).toEqual([id('Seekers')]);
 expect(find(ordinary,'Glutton for Punishment').map(r=>r.window)).toEqual(['Fight']);
 const guns=equip(ordinary,'Maulerfiend','Magma cutters');
 expect(find(guns,'Glutton for Punishment').map(r=>r.window)).toEqual(['Fight','Shooting','Movement']);
 expect(find(guns,'Glutton for Punishment')[2].summary).toMatch(/Half-strength.*Wound rolls.*snap shooting/);
});
it('gates non-leading and leading model abilities, stacks the psychic debuff at the correct time, and keeps the EC Defiler’s true trigger',()=>{
 const solo=build([s('Lucius the Eternal'),s('Sorcerer'),s('Lord Kakophonist'),s('Lord Exultant')]);
 expect(find(solo,'Duellist’s Hubris')[0]).toMatchObject({window:'Fight',timing:'start'});
 for(const name of ['Perfectionists','Warped Interference','Obsessive Annunciation'])expect(find(solo,name)).toEqual([]);
 const army=build([s('Noise Marines'),lead('Sorcerer','Noise Marines'),s('Chaos Spawn'),s('Defiler')]);
 expect(find(army,'Warped Interference')[0].units).toEqual([id('Sorcerer'),id('Noise Marines')]);
 expect(find(army,'Wracking Agonies')[0].summary).toMatch(/Sorcerer shoots.*Infantry.*Agonising Energies.*next turn.*2″/);
 expect(find(army,'Scuttling Horrors')[0]).toMatchObject({window:'Movement',turn:'opponent',summary:expect.stringMatching(/8″.*unengaged.*6″/)});
 expect(find(army,'Revel in Desecration').map(r=>r.window)).toEqual(['Shooting','Fight']);
 expect(find(army,'Revel in Desecration')[0].summary).toContain('not below Half-strength');
 expect(find(army,'Unleash Wrath')).toEqual([]);
});
it('separates source-specific paid gear, reroll targets, marked enemies and shared start-of-Fight triggers across repeated units',()=>{
 const ds=s('Daemonettes'),other={...ds,id:'Daemonettes#2'},noise=s('Noise Marines'),second={...noise,id:'Noise Marines#2'},t=s('Tormentors'),i=s('Infractors');
 const a=build([ds,other,noise,second,t,i],'Carnival of Excess','Strike Force');
 expect(find(a,'Horrifying Beauty')).toMatchObject([{window:'Fight',timing:'start',units:[ds.id,other.id]}]);
 expect(find(a,'Horrifying Beauty')[0].summary).toMatch(/one Battle-shock test/);
 expect(find(a,'Terrifying Crescendo').filter(r=>r.window==='Shooting').map(r=>r.units)).toEqual([[noise.id],[second.id]]);
 expect(find(a,'Objective Defiled')[0]).toMatchObject({window:'Command',timing:'end',turn:'own',units:[t.id],summary:expect.stringContaining('Level of Control')});
 expect(find(a,'Excessive Assault')[0]).toMatchObject({window:'Fight',turn:'either',units:[i.id],summary:expect.stringMatching(/Wound rolls of 1.*objective marker.*whole Wound roll/)});
});
