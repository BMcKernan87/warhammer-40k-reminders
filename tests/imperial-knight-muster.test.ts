import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {knightMusterFindings,knightUnitLimit,knightWarlordCandidates,resolvedKnightWarlord,selectKnightWarlord} from '../src/imperial-knight-muster';
import {individualArmy} from '../src/roster-instances';

const roster=(units:Record<string,number>,detachments=['Questor Forgepact'],size:ArmySelection['battleSize2026']='Strike Force')=>individualArmy({
 ...newSelection('Imperial Knights'),units,detachments2026:detachments,battleSize2026:size
});
const codes=(a:ArmySelection)=>knightMusterFindings(a).map(f=>f.code);

// https://wahapedia.ru/wh40k11ed/factions/imperial-knights/ — Knightly Teachings, Cogbound Alliance & Freeblades
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/ — 25.03–04
describe('Imperial Knight muster',()=>{
 it.each(['Armiger Helverin','Armiger Warglaive','Armiger Moirax'])('changes the %s copy limit only under Spearhead-at-arms',unit=>{
  const a=roster({[unit]:3,'Canis Rex':1},['Throne-bonded Outriders'],'Incursion');
  expect(knightUnitLimit(a,unit)).toBe(2);
  expect(codes(a)).toContain('rule-of-three');
  for(const [size,count] of [['Incursion',4],['Strike Force',6]] as const){
   const b=roster({[unit]:count,'Canis Rex':1},['Spearhead-at-arms'],size);
   expect(knightUnitLimit(b,unit)).toBe(count);
   expect(codes(b)).not.toContain('rule-of-three');
   expect(codes(roster({[unit]:count+1},['Spearhead-at-arms'],size))).toContain('rule-of-three');
  }
 });
 it('requires the Warlord to be a native Character even if a non-Character has Titanic or an ally has Character',()=>{
  const a=roster({'Tech-priest Dominus':1,'Armiger Warglaive':1,'Acastus Knight Asterius':1});
  expect(knightWarlordCandidates(a)).toEqual([]);
  expect(codes(a)).toContain('warlord-required');
  expect(()=>selectKnightWarlord(a,'Tech-priest Dominus#1')).toThrow();
  const b=roster({'Canis Rex':1,'Knight Paladin':1});
  expect(codes(b)).toContain('warlord-required');
  expect(resolvedKnightWarlord(selectKnightWarlord(b,'Knight Paladin#1'))?.unit).toBe('Knight Paladin');
  expect(resolvedKnightWarlord(roster({'Canis Rex':1,'Armiger Warglaive':1}))?.unit).toBe('Canis Rex');
 });
 it('allows multiple different native Titanic Knights and enforces the Epic Hero copy limit',()=>{
  const a=roster({'Canis Rex':1,'Knight Errant':2,'Knight Paladin':2});
  expect(codes(selectKnightWarlord(a,'Canis Rex#1'))).toEqual([]);
  expect(knightUnitLimit(a,'Canis Rex')).toBe(1);
  expect(codes(roster({'Canis Rex':2}))).toContain('rule-of-three');
  expect(knightUnitLimit(a,'Sir Hekhtur')).toBe(0);
 });
 it('permits both native Skitarii Battleline options only with Forgepact and requires a Bodyguard for each Marshal',()=>{
  const a=roster({'Knight Paladin':1,'Skitarii Marshal':1,'Skitarii Rangers':1,'Skitarii Vanguard':1});
  expect(knightUnitLimit(a,'Skitarii Rangers')).toBe(6);
  expect(codes(a)).toContain('mandatory-support');
  const b={...a,instances:a.instances!.map(s=>s.unit==='Skitarii Marshal'?{...s,attachedTo:'Skitarii Rangers#1'}:s)};
  expect(codes(b)).toEqual([]);
  expect(codes({...b,detachments2026:['Valourstrike Lance']})).toContain('knight-unit-ineligible');
 });
 it('counts upgrades and each whole allied unit toward a fixed 500 points, in either battle size',()=>{
  const allyNames={'Skitarii Rangers':2,'Skitarii Marshal':2,'Tech-priest Dominus':2,'Tech-priest Manipulus':2};
  for(const size of ['Incursion','Strike Force'] as const){
   const a=roster({'Knight Errant':1,'Armiger Warglaive':1,...allyNames},['Questor Forgepact'],size);
   const b={...a,upgrades2026:{'Tech-priest Dominus#1':'Magos Questoris'},instances:a.instances!.map(s=>s.unit==='Skitarii Marshal'?{...s,attachedTo:s.id.replace('Marshal','Rangers')}:s)};
   expect(codes(b)).toEqual([]); // 480 points of allies plus the 20-point enhancement.
   const c=roster({'Knight Errant':1,'Skitarii Rangers':3,'Tech-priest Dominus':2,'Tech-priest Manipulus':2},['Questor Forgepact'],size);
   expect(codes(c)).toEqual([]); // 495 allied points.
   expect(codes({...c,upgrades2026:{'Tech-priest Dominus#1':'Magos Questoris'}})).toContain('forgepact-ally-cap');
  }
 });
 it('enforces both the battle-size Agent allowance and the single-copy limit on individual Assassins',()=>{
  for(const detachment of ['Valourstrike Lance','Questor Forgepact']){
   const strike=roster({'Knight Errant':1,'Callidus Assassin':1,'Vindicare Assassin':1},[detachment]);
   expect(codes(strike)).toEqual([]);
   expect(knightUnitLimit(strike,'Callidus Assassin')).toBe(1);
   expect(knightWarlordCandidates(strike).map(s=>s.unit)).toEqual(['Knight Errant']);
   const incursion={...strike,battleSize2026:'Incursion' as const};
   expect(codes(incursion)).toEqual(['assigned-agents-character']);
   expect(codes(roster({'Knight Errant':1,'Vindicare Assassin':2},[detachment]))).toEqual(['rule-of-three']);
  }
 });
 it('reports points above the chosen battle size and detects unsupported unit names in edited data',()=>{
  const a=roster({'Knight Paladin':2,'Canis Rex':1,'Doomsday Ark':1},['Questor Forgepact'],'Incursion');
  expect(codes(a)).toContain('points-limit');
  expect(codes(a)).toContain('knight-unit-ineligible');
 });
});
