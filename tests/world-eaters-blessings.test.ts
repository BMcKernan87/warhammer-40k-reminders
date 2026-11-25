// @vitest-environment node
import {it,expect} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {worldEatersBlessingReminders} from '../src/world-eaters-blessings';
import {worldEaterLoadout} from '../src/world-eater-loadouts';
import {generate11thReminders} from '../src/reminders-11th';
import type {RosterInstance} from '../src/roster-instances';
const row=(unit:string,fields:Partial<RosterInstance>={}):RosterInstance=>({unit,id:unit+'#1',...fields});
const army=(...instances:RosterInstance[]):ArmySelection=>({...newSelection('World Eaters'),instances,detachments2026:['Khorne Daemonkin']});
const round=(a:ArmySelection)=>worldEatersBlessingReminders(a).find(r=>r.title==='Blessings of Khorne')!;
it('gives the six distinct dice prices and obeys the revised charge bonus in the actual sheet',()=>{
 const kharn=row('Khârn The Betrayer'),a=army(kharn);
 expect(round(a)).toMatchObject({window:'Start of battle round',timing:'start',units:[kharn.id]});
 expect(round(a).summary).toMatch(/eight D6.*two different.*Unbridled Bloodlust \(any double\).*Total Carnage \(double 3\+\).*Warp Blades \(double 5\+ or triple 2\+\).*Decapitating Strikes \(double 6 or triple 3\+\)/);
 const list=generate11thReminders(a);
 expect(list.filter(r=>r.id==='11e-we-blessings-Unbridled Bloodlust')).toMatchObject([{window:'Charge',turn:'own',summary:expect.stringContaining('Add 1 to the unit’s Charge rolls.')}]);
 expect(list.filter(r=>r.id==='11e-we-blessings-Total Carnage')).toMatchObject([{window:'Fight',turn:'either',summary:expect.stringMatching(/melee attack.*has not fought.*4\+/)}]);
});
it('discerns personal Blessings, entire legally led Bloodcrusher formations and unaffiliated Dreadblades',()=>{
 const body=row('Bloodcrushers',{models:3}),dog=row('War Dog Brigand'),lord=row('Lord on Juggernaut',{attachedTo:body.id,enhancement:'Disciple of Khorne'});
 const plain=round(army(row('Khorne Berzerkers'),body,dog)); 
 expect(plain.units).not.toContain(dog.id);
 expect(plain.summary).toMatch(/Conditional Blood Legions formations: Bloodcrushers#1.*Might of Khorne/);
 const led=round(army(lord,body,dog));
 expect(led.units).toEqual([body.id]);
 expect(led.summary).not.toContain('Conditional Blood Legions');
 expect(round({...army(row('Khorne Berzerkers'),body),detachments2026:['Berzerker Warband']}).units).not.toContain(body.id);
});
it('names the actual Icon of War bearer as an alternative for conditional Blood Legions',()=>{
 const bearer=row('Master of Executions',{enhancement:'Icon of War'}),daemons=row('Bloodletters');
 expect(round(army(bearer,daemons)).summary).toMatch(/Might of Khorne.*within 6″ of an Icon of War bearer \(Master of Executions#1\)/);
 expect(round(army(row('Master of Executions'),daemons)).summary).not.toContain('Icon of War bearer');
});
it('lists Bloodshed for equipped icons and never doubles the award for a formation with two',()=>{
 const unit=row('Khorne Berzerkers',{models:20});
 const slots=worldEaterLoadout(unit.unit,unit.models)!.slots.filter(slot=>slot.choices.some(c=>c.items.some(item=>item.toLowerCase()==='icon of khorne')));
 expect(slots.length).toBeGreaterThanOrEqual(2);
 const gear=Object.fromEntries(slots.slice(0,2).map(slot=>[slot.name,slot.choices.find(c=>c.items.some(item=>item.toLowerCase()==='icon of khorne'))!.name]));
 const equipped=worldEatersBlessingReminders(army({...unit,knightGear:gear}));
 expect(equipped.filter(r=>r.title==='Icon of Khorne · Bloodshed'&&r.window==='Fight')).toMatchObject([{units:[unit.id],summary:expect.stringContaining('one point for that destruction')}]);
 const absent=worldEatersBlessingReminders(army(row('Chaos Spawn')));
 expect(absent.some(r=>r.title==='Icon of Khorne · Bloodshed')).toBe(false);
});
it('separates the surviving primarch’s chosen presence from the destroyed primarch’s arrival',()=>{
 const unit=row('Angron'),skulls=row('Khorne Lord of Skulls'),a=army(unit,skulls);
 expect(round(a).summary).toMatch(/Idol of Blessed Blood.*Khorne Lord of Skulls#1.*on the battlefield.*chosen Wrathful Presence.*six dice/);
 const rules=worldEatersBlessingReminders(a).filter(r=>r.title.includes('Reborn in Blood'));
 expect(rules).toMatchObject([{window:'Start of battle round',summary:expect.stringMatching(/triple 6.*instead/)},{window:'Movement',turn:'own',summary:expect.stringMatching(/Deep Strike.*eight wounds/)}]);
 expect(worldEatersBlessingReminders(army(skulls)).some(r=>r.title.includes('Reborn'))).toBe(false);
});
it('generates a Dreadblade’s real card without giving it native Blessings or a Chaos Knights detachment',()=>{
 const dog=row('War Dog Brigand'),berzerkers=row('Khorne Berzerkers'),a=army(dog,berzerkers);
 const list=generate11thReminders(a);
 expect(list.some(r=>r.id.startsWith('11e-chaos-knight-card')&&r.units?.includes(dog.id))).toBe(true);
 expect(list.filter(r=>r.id.startsWith('11e-we-blessings')).some(r=>r.units?.includes(dog.id))).toBe(false);
});

it('includes the extra two-die reroll only for an equipped legal Favoured bearer',()=>{
 const bearer=row('Master of Executions',{enhancement:'Favoured of Khorne'});
 expect(round({...army(bearer),detachments2026:['Berzerker Warband']}).summary).toMatch(/Favoured of Khorne.*two dice.*Master of Executions#1/);
 expect(round(army(bearer)).summary).not.toContain('Favoured of Khorne');
});
