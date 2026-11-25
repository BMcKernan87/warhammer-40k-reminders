import {describe,expect,it} from 'vitest';
import {newSelection} from '../src/catalog';
import {agentDetachmentReminders as reminders,agentExtremisPoints,eligibleAgentUpgrades} from '../src/imperial-agent-detachments';
import {detachmentBudget} from '../src/edition-2026';

const fleet='Imperialis Fleet',hereticus='Ordo Hereticus, Purgation Force',malleus='Ordo Malleus, Daemon Hunters',xenos='Ordo Xenos, Alien Hunters',veiled='Veiled Blade Elimination Force';
function army(detachments:string[],...units:string[]){
 const counts:Record<string,number>={};
 return {...newSelection('Imperial Agents'),detachments2026:detachments,units:counts,instances:units.map(unit=>({unit,id:unit+'#'+(counts[unit]=(counts[unit]??0)+1)}))};
}
describe('Imperial Agents matched-play detachments',()=>{
 it.each([
  [fleet,'Navigator','Close-Quarters Barrage','Shooting','own','within 12″'],
  [malleus,'Grey Knights Terminator Squad','Truesilver Armour','Fight','either','finishes attacking'],
  [hereticus,'Vigilant Squad','Inviolate Jurisdiction','Shooting','opponent','Feel No Pain 5+'],
  [xenos,'Inquisitor Kroyle','Rapid Tactical Relocation','Fight','opponent','8″'],
  [veiled,'Callidus Assassin','Ensnaring Trap','Charge','opponent','+1 to Wound'],
 ])('%s scopes its reactive/active rules to real targets',(det,unit,title,phase,turn,text)=>{
  const row=reminders(army([det],unit,'Knight Paladin')).find(r=>r.title.startsWith(title)&&r.window===phase);
  expect(row).toMatchObject({turn,units:[unit+'#1']});
  expect(row?.summary).toContain(text);
 });
 it('charges the October Extremis costs and grants each ability automatically, outside the enhancement slots',()=>{
  const units=['Callidus Assassin','Culexus Assassin','Eversor Assassin','Vindicare Assassin'];
  const a=army([veiled],...units,'Vigilant Squad');
  expect(units.map(u=>agentExtremisPoints(a,u))).toEqual([15,10,15,20]);
  expect(units.map(u=>eligibleAgentUpgrades(a,u))).toEqual([[],[],[],[]]);
  expect(reminders(a).find(r=>r.title.includes('Esoteric Explosives'))).toMatchObject({window:'Shooting',units:['Culexus Assassin#1']});
  expect(reminders(a).filter(r=>r.title.includes('Micromelta Rounds')).map(r=>[r.window,r.turn])).toEqual([['Movement','opponent'],['Shooting','own']]);
  expect(reminders(a).find(r=>r.title.includes('Intraneural Biotech'))).toMatchObject({window:'Charge',turn:'opponent'});
  expect(reminders(a).find(r=>r.title.includes('Decoy Targets'))?.summary).toContain('Twice per battle');
  expect(agentExtremisPoints({...a,faction:'Imperial Knights'},units[0])).toBe(0);
  expect(reminders(army([veiled],'Callidus Assassin')).some(r=>r.title.includes('Decoy Targets'))).toBe(false);
 });
 it('uses separate model and unit keyword lists for the two Ordos',()=>{
  const a=army([hereticus,malleus],'Inquisitor','Sisters of Battle Squad','Inquisitorial Agents','Ministorum Priest','Navigator');
  const hero=reminders(a).find(r=>r.title==='Root out Heresy');
  expect(hero?.units).toEqual(['Inquisitor#1','Sisters of Battle Squad#1','Inquisitorial Agents#1','Ministorum Priest#1']);
  expect(reminders(a).find(r=>r.title.startsWith('Dispense Justice'))?.units).not.toContain('Inquisitor#1');
  expect(reminders(a).find(r=>r.title==='Destroy the Daemonic')?.units).toEqual(['Inquisitor#1','Inquisitorial Agents#1']);
 });
 it('does not backfill the event-only Deathwatch keyword in an October matched-play army',()=>{
  const a=army([xenos],'Watch Master','Deathwatch Kill Team','Corvus Blackstar','Inquisitor');
  expect(reminders(a).some(r=>r.title.startsWith('Hellfire Rounds')||r.title.includes('Deathwatch Mission Tactics'))).toBe(false);
  expect(reminders(a).find(r=>r.title.includes('Rapid Tactical Relocation'))?.units).toEqual(['Inquisitor#1']);
 });
 it('observes the exact phase range of Stun Grenades and the separate destruction requirement for Exact Punishment',()=>{
  const a=army([hereticus],'Vigilant Squad');
  expect(reminders(a).filter(r=>r.title.startsWith('Stun Grenades')).map(r=>[r.window,r.timing,r.turn])).toEqual(['Movement','Shooting','Charge','Fight'].map(phase=>[phase,'start','either']));
  expect(reminders(a).some(r=>r.title.startsWith('Exact Punishment'))).toBe(false);
  expect(reminders(army([hereticus],'Vigilant Squad','Navigator')).find(r=>r.title.startsWith('Exact Punishment'))?.units).toEqual(['Vigilant Squad#1']);
 });
 it('filters enhancement bearers, FAQ deployment recipients, and situational triggers',()=>{
  const a=army([fleet,malleus],'Inquisitor','Navigator','Imperial Navy Breachers','Inquisitor Greyfax','Grey Knights Terminator Squad');
  expect(eligibleAgentUpgrades(a,'Imperial Navy Breachers')).toEqual([]);
  expect(eligibleAgentUpgrades(a,'Inquisitor Greyfax')).toEqual([]);
  const upgraded={...a,upgrades2026:{'Navigator#1':'Combat Landers','Inquisitor#1':'Gift of the Prescient'}};
  const row=reminders(upgraded).find(r=>r.title.includes('Combat Landers'));
  expect(row).toMatchObject({window:'Pre-battle',units:['Navigator#1','Imperial Navy Breachers#1']});
  expect(row?.summary).toContain('Characters attached');
  expect(reminders(upgraded).find(r=>r.title.includes('Gift of the Prescient'))).toMatchObject({window:'Movement',turn:'opponent',units:['Grey Knights Terminator Squad#1']});
  const lone=army([hereticus],'Inquisitor');
  expect(reminders({...lone,upgrades2026:{'Inquisitor#1':'Witch Hunter'}}).some(r=>r.title.includes('Witch Hunter'))).toBe(false);
 });
 it('uses only legal joined formations and keeps model-only bonuses on the bearer',()=>{
  const base=army([fleet,hereticus],'Inquisitor','Ministorum Priest','Imperial Navy Breachers','Imperial Rhino');
  const attached={...base,instances:base.instances.map(s=>['Inquisitor','Ministorum Priest'].includes(s.unit)?{...s,attachedTo:'Imperial Navy Breachers#1'}:s),upgrades2026:{'Ministorum Priest#1':'Witch Hunter'}};
  const rows=reminders(attached);
  expect(rows.find(r=>r.title.startsWith('Selfless Bodyguard'))?.units).toEqual(['Imperial Navy Breachers#1']);
  expect(rows.find(r=>r.title.startsWith('Masters Of The Void'))?.units).toEqual(['Imperial Navy Breachers#1']);
  expect(rows.find(r=>r.title.includes('Witch Hunter'))?.units).toEqual(['Imperial Navy Breachers#1']);
  expect(rows.find(r=>r.title==='Root out Heresy')?.units).toEqual(['Inquisitor#1','Ministorum Priest#1']);
  const illegal={...attached,instances:attached.instances.map(s=>s.unit==='Ministorum Priest'?{...s,attachedTo:'Imperial Rhino#1'}:s)};
  expect(reminders(illegal).some(r=>r.title.includes('Witch Hunter'))).toBe(false);
 });
 it('computes legal combined-detachment DP and dispositions under MFM 1.6',()=>{
  expect(detachmentBudget('Imperial Agents',[fleet,veiled],'Strike Force')).toMatchObject({dispositions:['Reconnaissance','Disruption'],spent:3});
 });
});
