// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {individualArmy,setInstanceAttachment} from '../src/roster-instances';
import {availableUpgrades2026,eligibleUpgrades2026,selectUpgrade2026,upgradeError2026} from '../src/upgrades-2026';
import {setAstraProtector} from '../src/astra-protectors';
import {astraWarlordCandidates} from '../src/astra-muster-data';
import {ASTRA_DETACHMENTS,ASTRA_UPGRADES} from '../src/astra-detachments.generated';
import {astraMilitarumDetachmentReminders} from '../src/astra-militarum-detachments';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';

// Publisher's September 30 Astra Militarum v1.3 pack, PDF page 24:
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_astra_militarum-1hevkhdpmv-stfkch2tsz.pdf
// Loyal Protector expressly prohibits both Warlord selection and Enhancements;
// the CHARACTER keyword added by that same correction does not override either.
const id=(unit:string)=>unit+'#1';
function build(detachment='Recon Element'){
 let army=individualArmy({...newSelection('Astra Militarum'),detachments2026:[detachment]});
 for(const unit of ['Ogryn Bodyguard','Cadian Command Squad','Cadian Shock Troops','Commissar'])army=addSelectionUnit(army,unit);
 return army;
}
function joined(army:ArmySelection){
 return setInstanceAttachment(setAstraProtector(army,id('Ogryn Bodyguard'),id('Cadian Command Squad')),id('Cadian Command Squad'),id('Cadian Shock Troops'));
}

it.each(['Scare Gas Grenades','Survival Gear','Tripwires'])('rejects %s on an Ogryn Bodyguard before and after it joins a Command Squad',name=>{
 for(const army of [build(),joined(build())]){
  const bearer=army.instances!.find(s=>s.unit==='Ogryn Bodyguard')!;
  expect(eligibleUpgrades2026(army,bearer.unit,bearer.id)).toEqual([]);
  expect(availableUpgrades2026(army,bearer)).toEqual([]);
  expect(()=>selectUpgrade2026(army,bearer.id,name)).toThrow(/unavailable/);
 }
});

it.each(['Ogryn Bodyguard','Ogryn Bodyguard#1'])('detects a saved prohibited enhancement assigned through %s',key=>{
 const army={...joined(build()),upgrades2026:{[key]:'Tripwires'}};
 expect(upgradeError2026(army)).toMatch(/unavailable/);
 expect(validateSelection(JSON.parse(JSON.stringify(army)))).toBe(false);
 expect(rosterFindings(army)).toContainEqual(expect.objectContaining({code:'invalid-11e-upgrade',severity:'error'}));
 expect(astraMilitarumDetachmentReminders(army).some(r=>r.title.includes('Tripwires'))).toBe(false);
});

it('keeps a permitted Command Squad enhancement with its Loyal Protector and excludes the Protector from Warlord candidates',()=>{
 const base=joined(build()),army=selectUpgrade2026(base,id('Cadian Command Squad'),'Tripwires');
 expect(validateSelection(army)).toBe(true);
 expect(upgradeError2026(army)).toBeNull();
 expect(rosterCost2026(army).knownPoints-rosterCost2026(base).knownPoints).toBe(20);
 expect(astraWarlordCandidates(army).some(s=>s.unit==='Ogryn Bodyguard')).toBe(false);
 expect(availableUpgrades2026(army,army.instances!.find(s=>s.unit==='Commissar')!).some(u=>u.name==='Survival Gear')).toBe(true);
});

it('applies the publisher restriction across every current Guard detachment and the checked generated registry',()=>{
 for(const detachment of ASTRA_DETACHMENTS){
  const army=build(detachment.name);
  expect(eligibleUpgrades2026(army,'Ogryn Bodyguard',id('Ogryn Bodyguard')),detachment.name).toEqual([]);
 }
 expect(ASTRA_UPGRADES.flatMap(u=>u.units)).not.toContain('Ogryn Bodyguard');
});
