// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,CATALOG,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {DATASHEETS_2026,rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {AELDARI_SHEETS} from '../src/aeldari-data';
import {aeldariModelLoadouts,aeldariLoadout,validAeldariGear} from '../src/aeldari-loadouts';
import {aeldariKeywords} from '../src/aeldari-keywords';
import {aeldariMusterUnits} from '../src/aeldari-muster-data';
import {aeldariUnitLimit,aeldariWarlordCandidates,resolvedAeldariWarlord,selectAeldariWarlord} from '../src/aeldari-muster';
import {aeldariCargoFits,aeldariCargoFormations,aeldariDedicatedSatisfied,aeldariSplitCargoFormations,aeldariTransportReminders,aeldariFormations} from '../src/aeldari-transports';
import {aeldariArtilleryHosts,setAeldariArtillery,aeldariArtilleryReminders} from '../src/aeldari-artillery';
import {aeldariBattleFocusReminders} from '../src/aeldari-battle-focus';
import {aeldariDatasheetCoreReminders} from '../src/aeldari-datasheet-core';
import {individualArmy,setInstanceAttachment,setInstanceModelCount,autoAttachUnambiguousInstances,reconcileInstanceAttachments,removeRosterInstance,validateRosterInstances} from '../src/roster-instances';
import {knightLoadoutFor,setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole,knightJoinedBodyguard} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {migrateSavedArmy} from '../src/migrate-saved-army';
import {generate11thReminders} from '../src/reminders-11th';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],detachments=['Warhost'],size:ArmySelection['battleSize2026']='Strike Force'){
 let a=individualArmy({...newSelection('Aeldari'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const squad=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string,leaderCopy=1,bodyCopy=1)=>setInstanceAttachment(a,id(leader,leaderCopy),id(body,bodyCopy));
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
const cargo=(a:ArmySelection,carrier:string,n=1)=>aeldariCargoFormations(a,squad(a,carrier,n));

it('exposes the full current 76-sheet catalog and excludes Legends',()=>{
 expect(AELDARI_SHEETS).toHaveLength(76);expect(CATALOG.Aeldari.units).toEqual(AELDARI_SHEETS.map(s=>s.unit));
 expect(DATASHEETS_2026.filter(s=>s.faction==='Aeldari')).toHaveLength(76);
 for(const name of ['Karandras','Vampire Raider','Firestorm','Corsair Cloud Dancer Band','Corsair Reaver Band','Vyper'])expect(()=>addSelectionUnit(build([]),name)).toThrow();
});
it.each(AELDARI_SHEETS.map(s=>[s.unit,s] as const))('%s has physical models, legal starting strengths and published prices throughout the shared editor',(unit,sheet)=>{
 const a=build([unit],['Devoted of Ynnead']);
 for(const models of verifiedUnitSizes2026(a,unit)!){
  const changed=setInstanceModelCount(a,id(unit),models),entry=rosterCost2026(changed).entries[0];
  expect(validateSelection(changed)).toBe(true);
  expect(aeldariModelLoadouts(squad(changed,unit))).toHaveLength(models);
  expect(knightLoadoutFor('Aeldari',unit,models)).toBeDefined();
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('uses current detachment costs, dispositions and the shared Acrobatic unique tag',()=>{
 expect(detachmentBudget('Aeldari',['Warhost'],'Strike Force')).toMatchObject({spent:2,valid:true,dispositions:['Reconnaissance']});
 expect(detachmentBudget('Aeldari',['Aspect Host'],'Incursion')).toMatchObject({spent:3,limit:3,valid:true});
 expect(detachmentBudget('Aeldari',['Aspect Host'],'Strike Force').dispositions.sort()).toEqual(['Priority Assets','Reconnaissance']);
 expect(detachmentBudget('Aeldari',['Fateful Performance','Twilight Flickers'],'Strike Force').valid).toBe(false);
 expect(detachmentBudget('Aeldari',['Armoured Warhost','Path of the Outcast','Twilight Flickers'],'Strike Force').valid).toBe(true);
 const saved=migrateSavedArmy({...build(['Troupe Master'],["Serpent's Brood"]),units:{Vyper:1},instances:[{id:'Vyper#1',unit:'Vyper',models:1}]}) as ArmySelection;
 expect(saved.detachments2026).toEqual(['Serpent’s Brood']);expect(saved.units).toEqual({Vypers:1});expect(saved.instances?.[0].unit).toBe('Vypers');
});
it('gates all eleven Ynnari datasheets and keeps actual Asuryani, Harlequin and Epic Hero keywords',()=>{
 const normal=build(['Farseer','Troupe Master','Corsair Voidscarred','Yvraine','Asurmen']);
 expect(aeldariMusterUnits(normal)).toHaveLength(65);expect(aeldariMusterUnits(normal)).not.toContain('Yvraine');
 expect(errors(normal)).toContain('aeldari-ineligible');
 expect(aeldariKeywords(normal,squad(normal,'Farseer'))).not.toContain('YNNARI');
 expect(aeldariKeywords(normal,squad(normal,'Troupe Master'))).not.toContain('ASURYANI');
 const devoted={...normal,detachments2026:['Devoted of Ynnead']};
 expect(aeldariMusterUnits(devoted)).toHaveLength(76);
 expect(aeldariKeywords(devoted,squad(devoted,'Farseer'))).toContain('YNNARI');
 expect(aeldariKeywords(devoted,squad(devoted,'Asurmen'))).not.toContain('YNNARI');
 expect(errors(devoted)).toContain('aeldari-ynnari-epic-heroes');
 expect(errors(build(['Yvraine','The Visarch','The Yncarne'],['Devoted of Ynnead']))).not.toContain('aeldari-ynnari-epic-heroes');
});
it('requires a permitted Warlord and enforces Travelling Players without converting Support units into Characters',()=>{
 const normal=build(['Farseer','Troupe Master','Shadowseer','Solitaire','Warlock','Spiritseer']);
 expect(aeldariWarlordCandidates(normal).map(s=>s.unit)).toEqual(['Farseer','Warlock','Spiritseer']);
 expect(()=>selectAeldariWarlord(normal,id('Troupe Master'))).toThrow();
 const host={...normal,detachments2026:['Ghosts of the Webway']};
 expect(aeldariWarlordCandidates(host).map(s=>s.unit)).toEqual(['Farseer','Troupe Master','Shadowseer','Warlock','Spiritseer']);
 expect(()=>selectAeldariWarlord(host,id('Solitaire'))).toThrow();
 expect(aeldariUnitLimit(normal,'Death Jester')).toBe(1);expect(aeldariUnitLimit({...host,battleSize2026:'Incursion'},'Death Jester')).toBe(3);
 expect(aeldariUnitLimit(host,'Troupe')).toBe(6);expect(aeldariUnitLimit(normal,'Troupe')).toBe(3);
 const devoted=build(['Farseer','Yvraine','The Visarch'],['Devoted of Ynnead']);
 expect(aeldariWarlordCandidates(devoted).map(s=>s.unit)).toEqual(['Yvraine']);expect(resolvedAeldariWarlord(devoted)?.unit).toBe('Yvraine');
 expect(()=>selectAeldariWarlord(devoted,id('Farseer'))).toThrow();
 expect(errors(build(['Farseer'],['Devoted of Ynnead']))).toContain('aeldari-devoted-warlord');
});
it('uses the exact current Leader and mandatory Support lists with no invented Spiritseer attachment',()=>{
 const a=build(['Farseer','Warlock','Warlock Conclave','Guardian Defenders','Spiritseer','Wraithguard']);
 expect(instanceBodyguards(a,squad(a,'Farseer'))).toEqual(['Guardian Defenders','Storm Guardians']);
 expect(rosterAttachmentRole('Aeldari','Spiritseer')).toBeNull();
 expect(rosterAttachmentRole('Aeldari','Warlock')).toBe('support');
 const joined=join(join(a,'Farseer','Guardian Defenders'),'Warlock','Guardian Defenders');
 expect(knightJoinedBodyguard(joined,squad(joined,'Warlock'))?.unit).toBe('Guardian Defenders');
 expect(()=>join(joined,'Warlock Conclave','Guardian Defenders')).toThrow();
 expect(errors(joined)).toContain('mandatory-support');
 expect(()=>join(a,'Spiritseer','Wraithguard')).toThrow();
});
it('retains the MFM Skyrunner eligibility and counts a nested Support once in the same formation',()=>{
 const a=build(['Farseer Skyrunner','Farseer Skyrunner','Warlock Skyrunners','Windriders']);
 expect(instanceBodyguards(a,squad(a,'Farseer Skyrunner'))).toEqual(['Warlock Skyrunners','Windriders']);
 const joined=join(join(a,'Warlock Skyrunners','Windriders'),'Farseer Skyrunner','Warlock Skyrunners');
 expect(validateRosterInstances(joined)).toBe(true);
 expect(knightJoinedBodyguard(joined,squad(joined,'Farseer Skyrunner'))?.id).toBe(id('Windriders'));
 expect(aeldariFormations(joined).find(g=>g.root.id===id('Windriders'))?.members.map(s=>s.unit).sort()).toEqual(['Farseer Skyrunner','Warlock Skyrunners','Windriders']);
 expect(()=>join(joined,'Farseer Skyrunner','Windriders',2)).toThrow();
 const surviving=joined.instances!.filter(s=>s.unit!=='Windriders'&&s.id!==id('Farseer Skyrunner',2));
 expect(aeldariFormations(joined,surviving)).toHaveLength(1);expect(aeldariFormations(joined,surviving)[0].members).toHaveLength(2);
 const intermediateLost=joined.instances!.filter(s=>s.unit!=='Warlock Skyrunners'&&s.id!==id('Farseer Skyrunner',2));
 expect(aeldariFormations(joined,intermediateLost)).toHaveLength(1);
});
it('joins one optional Support Artillery independently of a Leader and Support and removes stale links',()=>{
 let a=build(['Farseer','Warlock','Guardian Defenders','D-cannon Platform','Shadow Weaver Platform','Wave Serpent']);
 a=join(join(a,'Farseer','Guardian Defenders'),'Warlock','Guardian Defenders');
 expect(errors(a)).not.toContain('mandatory-support');
 a=setAeldariArtillery(a,id('D-cannon Platform'),id('Guardian Defenders'));
 expect(validateSelection(a)).toBe(true);expect(aeldariFormations(a).find(g=>g.root.id===id('Guardian Defenders'))?.models).toBe(14);
 expect(aeldariArtilleryHosts(a,id('Shadow Weaver Platform'))).toEqual([]);
 expect(()=>setAeldariArtillery(a,id('Shadow Weaver Platform'),id('Guardian Defenders'))).toThrow();
 expect(cargo(a,'Wave Serpent')).toEqual([]);
 expect(aeldariArtilleryReminders(a).find(r=>r.units.includes(id('D-cannon Platform')))?.summary).toContain('separate Support Artillery slot');
 const removed=removeRosterInstance(a,id('Guardian Defenders'));
 expect(squad(removed,'D-cannon Platform').retinueTo).toBeUndefined();
 expect(reconcileInstanceAttachments({...a,instances:a.instances!.filter(s=>s.unit!=='Guardian Defenders'),units:{...a.units,'Guardian Defenders':0}}).instances?.find(s=>s.unit==='D-cannon Platform')?.retinueTo).toBeUndefined();
});
it('counts every Guardian platform and attached model against a Wave Serpent’s twelve spaces',()=>{
 let a=join(build(['Farseer','Guardian Defenders','Wave Serpent','Warlock']),'Farseer','Guardian Defenders');
 expect(cargo(a,'Wave Serpent').find(g=>g.root.id===id('Guardian Defenders'))).toMatchObject({models:12,spaces:12});
 a=join(a,'Warlock','Guardian Defenders');
 expect(cargo(a,'Wave Serpent')).toEqual([]);expect(aeldariDedicatedSatisfied(a)).toBe(false);
});
it('uses model-weighted Wraith capacity and different actual faction requirements for Falcon and Wave Serpent',()=>{
 const a=build(['Farseer','Wraithguard','Falcon','Wave Serpent','Troupe','Troupe Master','Starweaver','Yvraine'],['Devoted of Ynnead']);
 expect(cargo(a,'Wave Serpent').find(g=>g.root.unit==='Wraithguard')).toMatchObject({models:5,spaces:10});
 expect(cargo(a,'Falcon').some(g=>g.root.unit==='Wraithguard')).toBe(false);
 expect(cargo(a,'Falcon').some(g=>g.root.unit==='Yvraine')).toBe(true);
 expect(cargo(a,'Wave Serpent').some(g=>g.root.unit==='Yvraine')).toBe(false);
 const troupe=join(a,'Troupe Master','Troupe');
 expect(cargo(troupe,'Falcon').some(g=>g.root.unit==='Troupe')).toBe(true);
 expect(cargo(troupe,'Starweaver').find(g=>g.root.unit==='Troupe')?.models).toBe(6);
 expect(cargo(troupe,'Wave Serpent').some(g=>g.root.unit==='Troupe')).toBe(false);
 expect(aeldariCargoFits(troupe,squad(troupe,'Falcon'),[id('Troupe'),id('Yvraine')])).toBe(false);
});
it('splits a Ynnari formation once including its Leader and Support and never reuses passengers',()=>{
 let a=build(['Yvraine','The Visarch','Ynnari Kabalite Warriors','Ynnari Venom','Ynnari Venom'],['Devoted of Ynnead']);
 a=join(join(a,'Yvraine','Ynnari Kabalite Warriors'),'The Visarch','Ynnari Kabalite Warriors');
 expect(aeldariSplitCargoFormations(a,squad(a,'Ynnari Venom'))[0]).toMatchObject({models:12,halves:[6,6]});
 expect(aeldariDedicatedSatisfied(a)).toBe(true);expect(aeldariDedicatedSatisfied(addSelectionUnit(a,'Ynnari Venom'))).toBe(false);
 const raiders=build(['Yvraine','Ynnari Kabalite Warriors','Ynnari Raider','Ynnari Raider'],['Devoted of Ynnead']);
 expect(aeldariDedicatedSatisfied(join(raiders,'Yvraine','Ynnari Kabalite Warriors'))).toBe(false);
 const text=aeldariTransportReminders(a).find(r=>r.title.includes('Lithe Embarkation'))?.summary;
 expect(text).toContain('this same transport');expect(text).toContain('different transport');
});
it('keeps complete current disembarkation and actual-model split instructions',()=>{
 const a=build(['Farseer','Dire Avengers','Falcon']);
 const text=aeldariTransportReminders(a).find(r=>r.title.includes('· Disembarkation'))!.summary;
 for(const phrase of ['Rapid Disembark','Tactical Disembark','Combat Disembark','hazard roll','Battle-shocked','cannot charge','ingress'])expect(text).toContain(phrase);
});
it('permits Corsair upgrades on actual eligible units and prices duplicate Mistweave by detachment',()=>{
 const a=build(['Prince Yriel','Corsair Voidreavers','Shadowseer']);
 expect(eligibleUpgrades2026({...a,detachments2026:['Eldritch Raiders']},'Prince Yriel',id('Prince Yriel')).map(u=>u.name)).toContain('Pirate Prince');
 expect(eligibleUpgrades2026({...a,detachments2026:['Corsair Coterie']},'Corsair Voidreavers',id('Corsair Voidreavers')).length).toBeGreaterThan(0);
 const fateful=selectUpgrade2026({...a,detachments2026:['Fateful Performance']},id('Shadowseer'),'Mistweave (Fateful Performance)');
 const ghosts=selectUpgrade2026({...a,detachments2026:['Ghosts of the Webway']},id('Shadowseer'),'Mistweave (Ghosts of the Webway)');
 expect(rosterCost2026(fateful).entries.find(e=>e.unit==='Shadowseer')!.points!-rosterCost2026(ghosts).entries.find(e=>e.unit==='Shadowseer')!.points!).toBe(5);
});
it('generates current Battle Focus rather than the Legends army Strands of Fate',()=>{
 const a=build(['Farseer','Dire Avengers','Falcon','Revenant Titan'],['Warhost'],'Incursion');
 const rows=aeldariBattleFocusReminders(a);
 expect(rows.find(r=>r.title.includes('receive tokens'))?.summary).toContain('receive 3 Battle Focus tokens');
 expect(rows.find(r=>r.title==='Star Engines')?.summary).toContain('Assault');
 expect(rows.find(r=>r.title==='Sudden Strike')?.summary).toContain('ends a charge move');
 expect(rows.find(r=>r.title==='Swift as the Wind')?.summary).toContain('3″');
 expect(rows.find(r=>r.title==='Fade Back')?.summary).toContain('D6+2″');
 expect(rows.find(r=>r.title==='Fade Back')?.units).not.toContain(id('Revenant Titan'));
 expect(rows.find(r=>r.title==='Star Engines')?.units).not.toContain(id('Revenant Titan')); // Its actual keyword is Monster.
 expect(rows.find(r=>r.title==='Swift as the Wind')?.units).toContain(id('Revenant Titan'));
 expect(rows.every(r=>!r.title.includes('Strands of Fate'))).toBe(true);
});
it('retains the free repeatable Guardian Fade Back exception only while its source survives',()=>{
 const a=join(build(['Farseer','Guardian Defenders','Guardian Defenders']),'Farseer','Guardian Defenders');
 const fleet=aeldariBattleFocusReminders(a).find(r=>r.title.includes('Fleet of Foot'))!;
 expect(fleet.units).toEqual([id('Guardian Defenders'),id('Guardian Defenders',2)]);
 expect(fleet.summary).toContain('without spending');expect(fleet.summary).toContain('another unit already');
 expect(aeldariBattleFocusReminders(a,[squad(a,'Farseer')]).some(r=>r.title.includes('Fleet of Foot'))).toBe(false);
});
it('gates Spirit Guides on a surviving actual Psyker while preserving native Wraithknight Battle Focus',()=>{
 const a=build(['Spiritseer','Wraithguard','Wraithlord','Wraithknight'],['Spirit Conclave']);
 const rows=aeldariBattleFocusReminders(a),swift=rows.find(r=>r.title==='Swift as the Wind')!;
 expect(swift.units).toContain(id('Wraithguard'));expect(swift.units).toContain(id('Wraithlord'));expect(swift.units).toContain(id('Wraithknight'));
 expect(swift.summary).toContain('only while within 12″');
 const survivors=aeldariBattleFocusReminders(a,a.instances!.filter(s=>s.unit!=='Spiritseer'));
 expect(survivors.flatMap(r=>r.units)).not.toContain(id('Wraithguard'));
 expect(survivors.flatMap(r=>r.units)).toContain(id('Wraithknight'));
 expect(survivors.every(r=>!r.summary.includes('Spirit Guides'))).toBe(true);
});
it('inherits Autarch aspect training from the original Bodyguard and retains it after that Bodyguard dies',()=>{
 const a=join(build(['Autarch','Striking Scorpions']),'Autarch','Striking Scorpions');
 const rows=aeldariDatasheetCoreReminders(a,[squad(a,'Autarch')]);
 expect(rows.some(r=>r.title.endsWith('· Infiltrators'))).toBe(true);
 expect(rows.some(r=>r.title.endsWith('· Scouts 7″'))).toBe(true);
 expect(rows.some(r=>r.title.endsWith('· Stealth'))).toBe(true);
 expect(aeldariDatasheetCoreReminders(build(['Autarch'])).some(r=>r.title.endsWith('· Infiltrators'))).toBe(false);
});
it('automatically attaches only an unambiguous Leader and Support combination',()=>{
 const a=autoAttachUnambiguousInstances(build(['Farseer','Warlock','Guardian Defenders']));
 expect(squad(a,'Farseer').attachedTo).toBe(id('Guardian Defenders'));expect(squad(a,'Warlock').attachedTo).toBe(id('Guardian Defenders'));
 const ambiguous=autoAttachUnambiguousInstances(build(['Farseer','Farseer','Guardian Defenders']));
 expect(ambiguous.instances!.filter(s=>s.unit==='Farseer').every(s=>!s.attachedTo)).toBe(true);
});

it('retains Agile Manoeuvres after out-of-turn charges and reactive Fall Back moves',()=>{
 const a=build(['Troupe Master','Troupe'],['Ghosts of the Webway']);
 const rows=aeldariBattleFocusReminders(a);
 expect(rows.find(r=>r.title==='Sudden Strike')).toMatchObject({window:'Charge',turn:'either'});
 expect(rows.find(r=>r.title==='Sudden Strike · active effect')).toMatchObject({window:'Fight',turn:'either'});
 expect(rows.find(r=>r.title==='Flitting Shadows'&&r.window==='Charge')?.turn).toBe('either');
 expect(rows.filter(r=>r.title==='Opportunity Seized').map(r=>r.window)).toEqual(['Movement','Shooting','Fight']);
});

it('keeps both Mistweave choices stable and rejects two copies across different detachments',()=>{
 const a=build(['Shadowseer','Shadowseer'],['Ghosts of the Webway','Fateful Performance']);
 expect(detachmentBudget('Aeldari',a.detachments2026!,'Strike Force').valid).toBe(true);
 const choices=eligibleUpgrades2026(a,'Shadowseer',id('Shadowseer')).filter(u=>u.name.startsWith('Mistweave'));
 expect(choices.map(u=>[u.name,u.points]).sort()).toEqual([['Mistweave (Fateful Performance)',20],['Mistweave (Ghosts of the Webway)',15]]);
 const upgraded=selectUpgrade2026(a,id('Shadowseer'),'Mistweave (Fateful Performance)');
 expect(()=>selectUpgrade2026(upgraded,id('Shadowseer',2),'Mistweave (Ghosts of the Webway)')).toThrow(/allowed number of copies/);
 expect(eligibleUpgrades2026({...upgraded,detachments2026:['Fateful Performance']},'Shadowseer',id('Shadowseer')).some(u=>u.name==='Mistweave (Fateful Performance)')).toBe(true);
});

it('offers Explosives only while an actual Ynnari phantasm grenade launcher is equipped',()=>{
 const a=build(['Yvraine','Ynnari Kabalite Warriors'],['Devoted of Ynnead']);
 expect(aeldariKeywords(a,squad(a,'Ynnari Kabalite Warriors'))).not.toContain('GRENADES');
 expect(generate11thReminders(a).find(r=>r.title==='Explosives · 1CP')?.units??[]).not.toContain(id('Ynnari Kabalite Warriors'));
 const unit='Ynnari Kabalite Warriors',kit=aeldariLoadout(unit,10)!;
 const option=kit.slots.flatMap(field=>field.choices.filter(c=>c.items.includes('Phantasm grenade launcher')).map(choice=>({field:field.name,choice:choice.name}))).find(v=>validAeldariGear(unit,{[v.field]:v.choice},10))!;
 const equipped=setKnightGear(a,id(unit),option.field,option.choice);
 expect(aeldariKeywords(equipped,squad(equipped,unit))).toContain('GRENADES');
 expect(generate11thReminders(equipped).find(r=>r.title==='Explosives · 1CP')?.units).toContain(id(unit));
 const changed=setKnightGear(equipped,id(unit),option.field,kit.slots.find(slot=>slot.name===option.field)!.choices[0].name);
 expect(aeldariKeywords(changed,squad(changed,unit))).not.toContain('GRENADES');
});
