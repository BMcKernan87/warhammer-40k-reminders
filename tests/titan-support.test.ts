import {expect,it} from 'vitest';
import {newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {alliedRosterNames,alliedTitanAndKnightNames,alliedUnitLimit,alliedWarhound,freebladeSlotsRemaining} from '../src/titan-support-data';
import {expandRoster,type RosterInstance} from '../src/roster-instances';
import {knightWeaponCount,knightLoadoutFor,setKnightGear} from '../src/knight-loadouts';
import {alliedTitanAndKnightFindings,applyWarhoundStratagemCost} from '../src/titan-support';
import {generate11thReminders} from '../src/reminders-11th';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';

const model=(unit:string,id=unit+'#1'):RosterInstance=>({id,unit});
function army(faction:ArmySelection['faction'],...instances:RosterInstance[]):ArmySelection{
 const units:Record<string,number>={};
 for(const s of instances)units[s.unit]=(units[s.unit]??0)+1;
 return {...newSelection(faction),battleSize2026:'Strike Force',units,instances};
}
it.each(['Imperial Knights','Imperial Agents','Chaos Knights','Chaos Daemons','Adeptus Custodes'] as const)('offers one correctly aligned 1,100-point Warhound to %s at Strike Force only',faction=>{
 const name=alliedWarhound(faction)!,unit=model(name),roster=army(faction,unit);
 expect(name.startsWith('Chaos')).toBe(faction.startsWith('Chaos'));
 expect(alliedTitanAndKnightNames(roster)).toContain(name);
 expect(alliedTitanAndKnightNames({...roster,battleSize2026:'Incursion'})).not.toContain(name);
 expect(alliedUnitLimit(roster,name)).toBe(1);
 expect(rosterCost2026(roster).total).toBe(1100);
 expect(rosterFindings(roster).some(f=>f.code==='allied-model-keywords')).toBe(false);
 expect(alliedTitanAndKnightFindings({...roster,battleSize2026:'Incursion'}).map(f=>f.code)).toContain('titanic-support-budget');
 expect(alliedTitanAndKnightFindings(army(faction,unit,{...unit,id:name+'#2'})).map(f=>f.code)).toContain('titanic-support-limit');
 expect(alliedRosterNames(faction)).not.toContain('Reaver Titan');
 const wrong=name.startsWith('Chaos')?'Warhound Titan':'Chaos Warhound Titan';
 expect(knightLoadoutFor(faction,wrong)).toBeUndefined();
 expect(alliedTitanAndKnightNames(roster)).not.toContain(wrong);
});
it.each(['Imperial Knights','Chaos Knights'] as const)('handles all 16 Warhound arm pairs and only displays equipped profiles for %s',faction=>{
 const name=alliedWarhound(faction)!,unit=model(name),roster=army(faction,unit);
 const sheet=knightLoadoutFor(faction,name)!;
 let count=0;
 for(const left of sheet.slots[0].choices)for(const right of sheet.slots[1].choices){
  const altered=setKnightGear(setKnightGear(roster,unit.id,'Plasma arm',left.name),unit.id,'Vulcan arm',right.name);
  const squad=expandRoster(altered)[0];
  const restored=JSON.parse(JSON.stringify(altered));
  expect(validateSelection(restored)).toBe(true);
  const rules=generate11thReminders(restored).filter(r=>r.id.startsWith('11e-warhound-'));
  const shot=rules.find(r=>r.title.endsWith('Ranged weapon profiles'))!;
  for(const gun of ['Warhound inferno gun','Warhound plasma blastgun','Warhound turbo-laser destructor','Warhound vulcan mega-bolter']){
   const n=Number(gun===left.name)+Number(gun===right.name);
   expect(knightWeaponCount(squad,gun)).toBe(n);
   if(n)expect(shot.summary).toContain(n+' × '+gun);
   else expect(shot.summary).not.toContain(gun);
  }
  expect(rules.find(r=>r.title.endsWith('Flank Speed'))?.summary).toContain('8″');
  expect(rules.find(r=>r.title.endsWith('Ranged invulnerable save'))?.summary).toContain('5+');
  expect(rules.some(r=>r.title.includes('Deadly Demise 2D6'))).toBe(true);
  expect(new Set(rules.map(r=>r.id)).size).toBe(rules.length);
  count++;
 }
 expect(count).toBe(16);
});
it('applies double CP only when the Core Stratagem actually targets the Warhound',()=>{
 const titan=model('Warhound Titan'),knight=model('Knight Errant');
 const force=army('Imperial Knights',titan,knight);
 const rules=generate11thReminders(force);
 const strat=rules.find(r=>r.title.startsWith('Command Re-roll')&&r.units?.includes(titan.id))!;
 expect(strat.summary).toContain('Striding Colossus costs 2CP');
 expect(strat.summary).toContain(titan.id);
 expect(rules.find(r=>r.title==='Declare Strategic Reserves')?.units??[]).not.toContain(titan.id);
 expect(rules.find(r=>r.title.startsWith('Fire Overwatch'))?.units??[]).not.toContain(titan.id);
 expect(applyWarhoundStratagemCost({...strat,units:[knight.id],summary:'ordinary cost'},new Set([titan.id])).summary).toBe('ordinary cost');
});
it('charges a paid Crusader Freeblade gun and preserves Canis, Armiger or Titanic eligibility without Knight army rules',()=>{
 const crusader=model('Knight Crusader'),agent=model('Inquisitor');
 const armed=setKnightGear(army('Imperial Agents',agent,crusader),crusader.id,'Cannon','Rapid-fire battle cannon + Questoris heavy stubber');
 expect(rosterCost2026(armed).entries.find(e=>e.id===crusader.id)?.wargearPoints).toBe(15);
 expect(validateSelection(armed)).toBe(true);
 const rules=generate11thReminders(armed);
 expect(rules.some(r=>r.id.includes('Knight Crusader')&&r.title.includes('Ranged weapon profiles')&&r.summary.includes('Rapid-fire battle cannon'))).toBe(true);
 expect(rules.some(r=>r.title.startsWith('Code Chivalric'))).toBe(false);
 expect(freebladeSlotsRemaining(armed,'Armiger Helverin')).toBe(0);
 const armigers=army('Imperial Agents',agent,...['Armiger Helverin','Armiger Warglaive','Armiger Moirax'].map(n=>model(n)));
 expect(alliedTitanAndKnightFindings(armigers)).toEqual([]);
 expect(freebladeSlotsRemaining(armigers,'Knight Errant')).toBe(0);
 expect(freebladeSlotsRemaining(armigers,'Armiger Helverin')).toBe(0);
 const invalid=army('Imperial Agents',model('Canis Rex'),model('Armiger Helverin'));
 expect(alliedTitanAndKnightFindings(invalid).map(r=>r.code)).toContain('freeblade-allowance');
 expect(alliedTitanAndKnightFindings({...invalid,warlordId:'Canis Rex#1',upgrades2026:{'Canis Rex#1':'Illegal'}}).map(r=>r.code)).toEqual(expect.arrayContaining(['freeblade-warlord','freeblade-enhancement']));
 expect(alliedTitanAndKnightFindings(army('Imperial Knights',model('Canis Rex'),model('Armiger Helverin')))).toEqual([]);
});

it('keeps distinct native Custodes, Freeblade and Titan sheets without duplicating either card reminders or illegal-group findings',async()=>{
 const {DATASHEETS_2026}=await import('../src/datasheets-2026');
 const {custodesUnitLimit}=await import('../src/custodes-muster');
 const {custodesMusterUnits,custodesKeywords}=await import('../src/adeptus-custodes-data');
 const captain=model('Shield-Captain'),knight=model('Knight Crusader'),warhound=model('Warhound Titan');
 const force=army('Adeptus Custodes',captain,knight,warhound);
 expect(custodesUnitLimit(force,warhound.unit)).toBe(1);
 expect(custodesKeywords(force,warhound).has('TOWERING')).toBe(true);
 expect(custodesMusterUnits({...force,battleSize2026:'Incursion'})).not.toContain(warhound.unit);
 for(const s of [warhound,knight,captain])expect(DATASHEETS_2026.filter(d=>d.faction===force.faction&&d.unit===s.unit)).toHaveLength(1);
 const paid=setKnightGear(force,knight.id,'Cannon','Rapid-fire battle cannon + Questoris heavy stubber');
 expect(rosterCost2026(paid).entries.find(e=>e.id===knight.id)?.points).toBe(410);
 const sheet=generate11thReminders(paid).filter(r=>r.id.includes('Knight Crusader#1'));
 expect(new Set(sheet.map(r=>r.id)).size).toBe(sheet.length);
 expect(sheet.some(r=>r.title.includes('Ranged weapon profiles')&&r.summary.includes('Rapid-fire battle cannon'))).toBe(true);
 const invalid=army('Adeptus Custodes',captain,knight,model('Armiger Warglaive'));
 expect(rosterFindings(invalid).filter(f=>f.code==='freeblade-allowance')).toHaveLength(1);
});
