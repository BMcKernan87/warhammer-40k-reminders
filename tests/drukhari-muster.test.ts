// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,CATALOG,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {DATASHEETS_2026,rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {DRUKHARI_SHEETS,DRUKHARI_ALLIED_SHEETS,DRUKHARI_NATIVE_SHEETS} from '../src/drukhari-data';
import {drukhariModelLoadouts,drukhariLoadout} from '../src/drukhari-loadouts';
import {drukhariKeywords} from '../src/drukhari-keywords';
import {drukhariMusterUnits,drukhariAllyAllowance,isDrukhariHarlequin} from '../src/drukhari-muster-data';
import {drukhariUnitLimit,drukhariWarlordCandidates,resolvedDrukhariWarlord,selectDrukhariWarlord,drukhariAlliedReminders} from '../src/drukhari-muster';
import {drukhariCargoFits,drukhariCargoFormations,drukhariDedicatedSatisfied,drukhariSplitCargoFormations,drukhariTransportReminders,drukhariFormations} from '../src/drukhari-transports';
import {individualArmy,setInstanceAttachment,setInstanceModelCount,autoAttachUnambiguousInstances,reconcileInstanceAttachments,removeRosterInstance} from '../src/roster-instances';
import {setKnightGear,knightLoadoutFor} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026,eligibleUpgrades2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole,knightJoinedBodyguard} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {migrateSavedArmy} from '../src/migrate-saved-army';
import {formationDeploymentReminders} from '../src/formation-deployment';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],detachments=['Realspace Raiders'],size:ArmySelection['battleSize2026']='Strike Force'){
 let a=individualArmy({...newSelection('Drukhari'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)a=addSelectionUnit(a,unit);
 return a;
}
const squad=(a:ArmySelection,unit:string,n=1)=>a.instances!.find(s=>s.id===id(unit,n))!;
const join=(a:ArmySelection,leader:string,body:string,leaderCopy=1,bodyCopy=1)=>setInstanceAttachment(a,id(leader,leaderCopy),id(body,bodyCopy));
const errors=(a:ArmySelection)=>rosterFindings(a).filter(f=>f.severity==='error').map(f=>f.code);
const cargo=(a:ArmySelection,carrier:string,n=1)=>drukhariCargoFormations(a,squad(a,carrier,n));

it('replaces the four-unit starter catalog with the exact current native and allied registry',()=>{
 expect(DRUKHARI_NATIVE_SHEETS).toHaveLength(23);expect(DRUKHARI_ALLIED_SHEETS).toHaveLength(14);
 expect(CATALOG.Drukhari.units).toEqual(DRUKHARI_SHEETS.map(s=>s.unit));
 expect(DATASHEETS_2026.filter(s=>s.faction==='Drukhari').map(s=>s.unit).sort()).toEqual([...CATALOG.Drukhari.units].sort());
 for(const name of ['Urien Rakarth','Grotesques','Beastmaster','Court of the Archon','Reaper','Tantalus','Raven Strike Fighter','Corsair Cloud Dancer Band','Corsair Reaver Band'])expect(()=>addSelectionUnit(build([]),name)).toThrow();
});
it.each(DRUKHARI_SHEETS.map(s=>[s.unit,s] as const))('%s uses complete legal physical models and prices through the shared editor',(unit,sheet)=>{
 const a=build([unit]);
 for(const models of verifiedUnitSizes2026(a,unit)!){
  const changed=setInstanceModelCount(a,id(unit),models),entry=rosterCost2026(changed).entries[0];
  expect(validateSelection(changed)).toBe(true);
  expect(drukhariModelLoadouts(squad(changed,unit))).toHaveLength(models);
  expect(knightLoadoutFor('Drukhari',unit,models)).toBeDefined();
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('normalizes saved Reaper spelling and records both current force dispositions',()=>{
 const a=migrateSavedArmy(build(['Archon'],["Reaper's Wager"])) as ArmySelection;
 expect(a.detachments2026).toEqual(['Reaper’s Wager']);expect(validateSelection(a)).toBe(true);
 expect(detachmentBudget('Drukhari',a.detachments2026!,'Incursion')).toMatchObject({valid:true,spent:3,limit:3});
 expect(detachmentBudget('Drukhari',a.detachments2026!,'Strike Force').dispositions.sort()).toEqual(['Priority Assets','Purge the Foe']);
 expect(detachmentBudget('Drukhari',["Reaper's Wager",'Reaper’s Wager'],'Strike Force').valid).toBe(false);
 const padded={...a,detachments2026:["  reaper's wager  "]};
 expect(drukhariAllyAllowance(padded)).toBe(1000);expect(drukhariMusterUnits(padded)).not.toContain('Corsair Voidreavers');
});
it.each([['Spectacle of Spite','Exhibition of Slaughter'],['Covenite Coterie','Tools of Torment'],['Kabalite Cartel','Kabalite Agonysts']])('rejects the shared unique tag for %s and %s even within the DP budget',(a,b)=>{
 expect(detachmentBudget('Drukhari',[a,b],'Strike Force')).toMatchObject({spent:3,valid:false});
});
it('allows three distinct one-DP detachment tags and uses current dispositions',()=>{
 const b=detachmentBudget('Drukhari',['Exhibition of Slaughter','Kabalite Agonysts','Tools of Torment'],'Strike Force');
 expect(b).toMatchObject({valid:true,spent:3});expect(b.dispositions.sort()).toEqual(['Disruption','Reconnaissance','Take and Hold']);
});
it('does not give allied models synthetic Drukhari keywords or native Warlord permission',()=>{
 const a=build(['Archon',...DRUKHARI_ALLIED_SHEETS.map(s=>s.unit)]);
 for(const row of DRUKHARI_ALLIED_SHEETS){
  expect(drukhariKeywords(a,squad(a,row.unit))).not.toContain('DRUKHARI');
  expect(drukhariKeywords(a,squad(a,row.unit))).not.toContain('YNNARI');
  expect(()=>selectDrukhariWarlord(a,id(row.unit))).toThrow();
 }
 expect(drukhariWarlordCandidates(a).map(s=>s.unit)).toEqual(['Archon']);
 expect(resolvedDrukhariWarlord(a)?.id).toBe(id('Archon'));
 expect(errors({...a,warlordId:id('Prince Yriel')})).toContain('drukhari-warlord-ineligible');
});
it('keeps native named Characters eligible without inventing a mandatory Warlord',()=>{
 const a=build(['Archon','Lady Malys','Lelith Hesperax','Drazhar','Haemonculus','Succubus']);
 expect(drukhariWarlordCandidates(a)).toHaveLength(6);expect(resolvedDrukhariWarlord(a)).toBeUndefined();
 expect(resolvedDrukhariWarlord(selectDrukhariWarlord(a,id('Drazhar')))?.unit).toBe('Drazhar');
 expect(drukhariKeywords(a,squad(a,'Lady Malys'))).toContain('ARCHON');
 expect(drukhariKeywords(a,squad(a,'Lelith Hesperax'))).toContain('SUCCUBUS');
});
it('checks the combined normal allied allowance and replacement Reaper allowance',()=>{
 const a=build(['Archon','Troupe','Voidweaver','Corsair Voidreavers'],['Realspace Raiders'],'Incursion');
 expect(rosterCost2026(a).entries.filter(s=>s.unit!=='Archon').reduce((n,s)=>n+s.points!,0)).toBe(265);
 expect(drukhariAllyAllowance(a)).toBe(250);expect(errors(a)).toContain('drukhari-allied-allowance');
 const wager={...a,detachments2026:['Reaper’s Wager']};
 expect(drukhariAllyAllowance(wager)).toBe(500);expect(drukhariMusterUnits(wager)).toHaveLength(31);
 expect(drukhariMusterUnits(wager)).not.toContain('Corsair Voidreavers');expect(errors(wager)).toContain('drukhari-ineligible');
 const harlequins=build(['Archon','Voidweaver','Voidweaver','Troupe','Troupe','Skyweavers'],['Reaper’s Wager'],'Incursion');
 expect(errors(harlequins)).not.toContain('drukhari-allied-allowance');
 expect(errors(addSelectionUnit(harlequins,'Death Jester'))).toContain('drukhari-allied-allowance');
 const notes=drukhariAlliedReminders(wager).map(r=>r.summary).join(' ');
 expect(notes).toContain('do not stack');expect(notes).toContain('None can be Warlord');
});
it('only permits Harlequin enhancements through their printed Reaper exception',()=>{
 const a=build(['Archon','Troupe Master','Shadowseer','Solitaire','Prince Yriel','Cronos']);
 expect(eligibleUpgrades2026(a,'Troupe Master',id('Troupe Master'))).toEqual([]);
 const wager={...a,detachments2026:['Reaper’s Wager']};
 expect(eligibleUpgrades2026(wager,'Troupe Master',id('Troupe Master')).map(u=>u.name)).toContain('Reaper’s Cowl');
 expect(eligibleUpgrades2026(wager,'Solitaire',id('Solitaire'))).toEqual([]);
 expect(eligibleUpgrades2026(wager,'Prince Yriel',id('Prince Yriel'))).toEqual([]);
 const changed=selectUpgrade2026(wager,id('Troupe Master'),'Reaper’s Cowl');
 expect(rosterCost2026(changed).entries.find(e=>e.unit==='Troupe Master')?.points).toBe(100);
 expect(eligibleUpgrades2026({...a,detachments2026:['Tools of Torment']},'Cronos',id('Cronos')).some(u=>u.repeatable)).toBe(true);
});
it('uses the selected detachment to price duplicate enhancement names',()=>{
 const a=build(['Archon'],['Kabalite Agonysts']);
 const agonyst=selectUpgrade2026(a,id('Archon'),'Towering Arrogance');
 const cartel=selectUpgrade2026({...a,detachments2026:['Kabalite Cartel']},id('Archon'),'Towering Arrogance');
 expect(rosterCost2026(agonyst).total).toBe(95);expect(rosterCost2026(cartel).total).toBe(100);
});
it('uses current normal, Battleline, Dedicated Transport and Epic Hero copy limits',()=>{
 const a=build([],['Realspace Raiders'],'Incursion');
 expect(drukhariUnitLimit(a,'Incubi')).toBe(2);expect(drukhariUnitLimit(a,'Kabalite Warriors')).toBe(4);
 expect(drukhariUnitLimit(a,'Venom')).toBe(4);expect(drukhariUnitLimit(a,'Lady Malys')).toBe(1);
 expect(drukhariUnitLimit(a,'Solitaire')).toBe(1);expect(drukhariUnitLimit(a,'Corsair Voidreavers')).toBe(4);
 expect(drukhariUnitLimit({...a,detachments2026:['Reaper’s Wager']},'Prince Yriel')).toBe(0);
 expect(drukhariUnitLimit({...a,battleSize2026:'Strike Force'},'Raider')).toBe(6);
});
it('counts compulsory Aircraft against the starting reserve allowance',()=>{
 const a=build(['Archon','Razorwing Jetfighter','Voidraven Bomber'],['Realspace Raiders'],'Incursion');
 expect(errors(a)).not.toContain('mandatory-reserves-limit');
 const formations=drukhariFormations(a).map(g=>({id:g.root.id,body:g.root,members:g.members}));
 const rows=formationDeploymentReminders(a,formations,unit=>DRUKHARI_SHEETS.find(s=>s.unit===unit)?.keywords??[]);
 const declaration=rows.find(r=>r.id==='11e-formation-reserve-declaration')!;
 expect(declaration.summary).toContain('starting allowance is 500 points');
 expect(declaration.summary).toContain('After compulsory Aircraft, 85 points remain');
 expect(declaration.units).toEqual([id('Archon')]);
 expect(errors(addSelectionUnit(a,'Razorwing Jetfighter'))).toContain('mandatory-reserves-limit');
});
it('automatically attaches a single legal option and preserves an explicit unattached choice',()=>{
 const a=build(['Archon','Kabalite Warriors']);
 const linked=autoAttachUnambiguousInstances(a);expect(squad(linked,'Archon').attachedTo).toBe(id('Kabalite Warriors'));
 const separate=setInstanceAttachment(linked,id('Archon'),null);
 expect(squad(autoAttachUnambiguousInstances(separate),'Archon').attachedTo).toBeUndefined();
});
it('enforces real native and allied Leader permissions with no invented Support slot',()=>{
 let a=build(['Archon','Lady Malys','Kabalite Warriors','Haemonculus','Wracks','Troupe Master','Shadowseer','Troupe','Prince Yriel','Kharseth','Corsair Voidscarred']);
 a=join(a,'Archon','Kabalite Warriors');a=join(a,'Troupe Master','Troupe');a=join(a,'Prince Yriel','Corsair Voidscarred');
 expect(()=>join(a,'Lady Malys','Kabalite Warriors')).toThrow();expect(()=>join(a,'Shadowseer','Troupe')).toThrow();
 expect(()=>join(a,'Kharseth','Corsair Voidscarred')).toThrow();expect(()=>join(a,'Haemonculus','Kabalite Warriors')).toThrow();
 for(const row of DRUKHARI_SHEETS.filter(s=>s.attachmentRole))expect(rosterAttachmentRole('Drukhari',row.unit)).toBe('leader');
 expect(instanceBodyguards({...a,detachments2026:['Reaper’s Wager']},squad(a,'Prince Yriel'))).toEqual([]);
 expect(squad(reconcileInstanceAttachments({...a,detachments2026:['Reaper’s Wager']}),'Prince Yriel').attachedTo).toBeUndefined();
});
it.each([['Kabalite Warriors','Archon','Raider',11],['Wyches','Succubus','Raider',11],['Incubi','Archon','Venom',6],['Wracks','Haemonculus','Venom',6],['Troupe','Troupe Master','Starweaver',6]])('counts the full %s + %s formation aboard a %s',(body,leader,carrier,count)=>{
 const a=join(build([body,leader,carrier]),leader,body),g=cargo(a,carrier);
 expect(g).toHaveLength(1);expect(g[0]).toMatchObject({models:count,spaces:count});
 expect(drukhariCargoFits(a,squad(a,carrier),[id(body)])).toBe(true);expect(drukhariDedicatedSatisfied(a)).toBe(true);
 expect(knightJoinedBodyguard(a,squad(a,leader))?.id).toBe(id(body));
});
it('counts combined cargo once, rejects duplicate claims and rejects overcapacity',()=>{
 const a=build(['Archon','Haemonculus','Incubi','Venom']);
 expect(drukhariCargoFits(a,squad(a,'Venom'),[id('Archon'),id('Incubi')])).toBe(true);
 expect(drukhariCargoFits(a,squad(a,'Venom'),[id('Archon'),id('Haemonculus'),id('Incubi')])).toBe(false);
 expect(drukhariCargoFits(a,squad(a,'Venom'),[id('Incubi'),id('Incubi')])).toBe(false);
});
it('keeps native and Harlequin transport eligibility separate and excludes Jump Packs',()=>{
 const a=build(['Corsair Voidreavers','Scourges with Heavy Weapons','Scourges with Shardcarbines','Skyweavers','Troupe','Kabalite Warriors','Raider','Venom','Starweaver']);
 expect(cargo(a,'Raider').map(g=>g.root.unit)).toEqual(['Kabalite Warriors']);
 expect(cargo(a,'Venom')).toEqual([]);expect(cargo(a,'Starweaver').map(g=>g.root.unit)).toEqual(['Troupe']);
 for(const carrier of ['Raider','Venom','Starweaver'])expect(cargo(a,carrier).some(g=>g.root.unit==='Corsair Voidreavers')).toBe(false);
});
it.each(['Kabalite Warriors','Hand of the Archon','Wyches'])('Venom can split %s with an attached Character into five and six physical models',body=>{
 const leader=body==='Wyches'?'Succubus':'Archon';
 const a=join(build([leader,body,'Venom','Venom']),leader,body),first=squad(a,'Venom');
 expect(cargo(a,'Venom')).toEqual([]);
 expect(drukhariSplitCargoFormations(a,first).map(g=>g.halves)).toEqual([[5,6]]);
 expect(drukhariDedicatedSatisfied(a)).toBe(true);
 expect(drukhariDedicatedSatisfied(addSelectionUnit(a,'Venom'))).toBe(false);
 expect(drukhariTransportReminders(a).find(r=>r.id==='11e-drukhari-cargo-'+first.id)?.summary).toContain('5 + 6 models');
});
it('a Venom split can fill a second Raider but does not supply a third passenger group',()=>{
 const a=join(build(['Archon','Kabalite Warriors','Venom','Raider']),'Archon','Kabalite Warriors');
 expect(drukhariDedicatedSatisfied(a)).toBe(true);
 expect(drukhariDedicatedSatisfied(addSelectionUnit(a,'Raider'))).toBe(false);
 const withoutVenom=removeRosterInstance(a,id('Venom'));
 expect(drukhariDedicatedSatisfied(addSelectionUnit(withoutVenom,'Raider'))).toBe(false);
});
it('does not split Incubi or Wracks to invent passengers for empty Venoms',()=>{
 const a=join(build(['Archon','Incubi','Venom','Venom']),'Archon','Incubi');
 expect(drukhariSplitCargoFormations(a,squad(a,'Venom'))).toEqual([]);
 expect(drukhariDedicatedSatisfied(a)).toBe(false);expect(errors(a)).toContain('dedicated-transport-passengers');
 const b=join(build(['Haemonculus','Wracks','Venom','Venom']),'Haemonculus','Wracks');
 expect(drukhariDedicatedSatisfied(b)).toBe(false);
});
it('cannot fill a Starweaver with spare native split halves',()=>{
 const a=join(build(['Archon','Kabalite Warriors','Venom','Starweaver']),'Archon','Kabalite Warriors');
 expect(drukhariDedicatedSatisfied(a)).toBe(false);
 expect(drukhariDedicatedSatisfied(addSelectionUnit(a,'Troupe'))).toBe(true);
});
it('refuses an invalid attachment instead of treating its models as spare cargo',()=>{
 const a=build(['Archon','Wracks','Venom']);
 const invalid={...a,instances:a.instances!.map(s=>s.unit==='Archon'?{...s,attachedTo:id('Wracks')}:s)};
 expect(errors(invalid)).toContain('invalid-attachment');expect(cargo(invalid,'Venom')).toEqual([]);
});
it('uses surviving physical passengers while retaining original attachment evidence',()=>{
 const a=join(build(['Archon','Incubi','Venom']),'Archon','Incubi');
 const withoutLeader=a.instances!.filter(s=>s.unit!=='Archon');
 expect(drukhariCargoFormations(a,squad(a,'Venom'),withoutLeader)[0].models).toBe(5);
 const withoutBody=a.instances!.filter(s=>s.unit!=='Incubi');
 expect(drukhariFormations(a,withoutBody).find(g=>g.root.unit==='Archon')?.models).toBe(1);
 expect(drukhariCargoFormations(a,squad(a,'Venom'),withoutBody)[0].root.unit).toBe('Archon');
});
it('prints distinct native and Harlequin end-of-Fight embark permissions',()=>{
 const a=join(build(['Archon','Incubi','Venom','Troupe','Starweaver']),'Archon','Incubi');
 const rows=drukhariTransportReminders(a),venom=rows.find(r=>r.title.includes('Aerialists'))!,star=rows.find(r=>r.title.includes('Rapid Embarkation'))!;
 expect(venom).toMatchObject({window:'Fight',turn:'either',timing:'end'});expect(star).toMatchObject({window:'Fight',turn:'either',timing:'end'});
 expect(venom.summary).toContain('disembarked from a transport');expect(venom.summary).toContain('cannot be a unit that can Fly');
 expect(star.summary).toContain('disembarked from this transport');
 expect(venom.summary).not.toContain(id('Troupe'));expect(star.summary).not.toContain(id('Incubi'));
});
it.each(['Raider','Venom','Starweaver'])('%s follows the current Rapid, Tactical and Combat disembark branches',carrier=>{
 const body=carrier==='Starweaver'?'Troupe':'Incubi';
 const a=build([body,carrier]),row=drukhariTransportReminders(a).find(r=>r.title===id(carrier)+' · Disembarkation')!;
 expect(row).toMatchObject({window:'Movement',turn:'own'});
 expect(row.summary).toContain('After a Normal or ingress move, use Rapid Disembark');
 expect(row.summary).toContain('placement is possible, use Tactical Disembark wholly within 3″');
 expect(row.summary).toContain('If Tactical placement is impossible, use Combat Disembark wholly within 6″');
 expect(row.summary).toContain('make a hazard roll for each model');
 expect(row.summary).toContain('enemies already engaging this transport');
 expect(row.summary).toContain('Battle-shocked and unable to charge this turn');
 if(carrier==='Venom')expect(row.summary).toContain('Rapid Deployment (Pain) can instead permit Shock Disembark');
});
it('keeps actual optional Corsair Psyker keywords tied to the equipped model',()=>{
 let a=setInstanceModelCount(build(['Archon','Corsair Voidscarred']),id('Corsair Voidscarred'),10);
 expect(drukhariKeywords(a,squad(a,'Corsair Voidscarred'))).not.toContain('PSYKER');
 const loadout=drukhariLoadout('Corsair Voidscarred',10)!;
 const slot=loadout.slots.find(s=>s.choices.some(c=>/Way Seeker/i.test(c.name)))!;
 const option=slot.choices.find(c=>/Way Seeker/i.test(c.name))!;
 a=setKnightGear(a,id('Corsair Voidscarred'),slot.name,option.name);
 const unit=squad(a,'Corsair Voidscarred'),models=drukhariModelLoadouts(unit);
 const psychic=models.find(m=>/Way Seeker/i.test(m.model))!;
 expect(drukhariKeywords(a,unit)).toContain('PSYKER');expect(drukhariKeywords(a,unit,psychic.model)).toContain('PSYKER');
 for(const model of models.filter(m=>m!==psychic))expect(drukhariKeywords(a,unit,model.model)).not.toContain('PSYKER');
 expect(isDrukhariHarlequin('Corsair Voidscarred')).toBe(false);
});
