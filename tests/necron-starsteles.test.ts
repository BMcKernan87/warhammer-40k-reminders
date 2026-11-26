import {describe, expect, it} from 'vitest';
import {addSelectionUnit, newSelection} from '../src/catalog';
import {expandRoster, setInstanceModelCount} from '../src/roster-instances';
import {generate11thReminders} from '../src/reminders-11th';
import {necronBattleFormations, necronBattleRoster} from '../src/necron-battle-units';
import {necronFormationRoots} from '../src/necron-retinues';
import {necronDatasheetReminders2026} from '../src/necron-datasheet-reminders-2026';
import {rosterCost2026} from '../src/datasheets-2026';
import {rosterFindings} from '../src/roster-findings';
import {initialStore, validateStore} from '../src/profiles';

// Current App Necrons v1.2 card, checked 26 November 2026:
// https://wahapedia.ru/wh40k11ed/factions/necrons/Convergence-Of-Dominion
// Buy 1–3 Starsteles, then treat each model as a separate unit after setup.
// Reanimation heals each surviving unit; Undying Legions requires a surviving
// unit that lost a model. A destroyed one-model Starstele cannot satisfy that.
// Core Rules p86: Starting Strength is set at the start of the first round.
// https://assets.warhammer-community.com/eng_01-06_warhammer40k_new40k_core_rules-was6fbu1ix-hfewhmxyiy.pdf
const unit='Convergence Of Dominion';
const purchase=unit+'#1';
const starsteles=[1,2,3].map(n=>purchase+' · Starstele '+n);
const army=(models=3)=>setInstanceModelCount(addSelectionUnit(newSelection('Necrons'),unit),purchase,models);

describe('Convergence units after deployment',()=>{
  it.each([1,2,3])('projects a %i-model purchase without changing its saved identity, cost, or deployment group',models=>{
    const stored=JSON.parse(JSON.stringify(initialStore(army(models))));
    expect(validateStore(stored)).toBe(true);
    const reopened=stored.profiles[0].army;
    const before=JSON.stringify(stored),findings=rosterFindings(reopened);
    const projected=necronBattleFormations(reopened);
    expect(projected.map(f=>f.id)).toEqual(models===1?[purchase]:starsteles.slice(0,models));
    for(const f of projected){
      expect(f.members).toEqual([f.body]);
      expect(f.body.models).toBe(1);
      expect(f.originalBody.models).toBe(1);
    }
    const rows=generate11thReminders(reopened);
    const placement=rows.filter(r=>r.id.startsWith('11e-necron-extra-starsteles-'));
    expect(placement.map(r=>r.units)).toEqual(models===1?[]:[[purchase]]);
    expect(necronFormationRoots(reopened).map(f=>[f.id,f.body.models])).toEqual([[purchase,models]]);
    expect(rosterCost2026(reopened).entries).toMatchObject([{id:purchase,models,points:60*models}]);
    expect(rosterCost2026(reopened).entries).toHaveLength(1);
    expect(reopened.units[unit]).toBe(1);
    expect(rosterFindings(reopened)).toEqual(findings);
    expect(JSON.stringify(stored)).toBe(before);
    expect(rows.find(r=>r.id==='11e-core-rapid-ingress')?.units??[]).toEqual([]);
  });

  it('keeps source names stable across duplicate-purchase ordering and repeated projection',()=>{
    const second=unit+'#2';
    const duplicate=setInstanceModelCount(addSelectionUnit(army(),unit),second,2);
    const projected=necronBattleRoster(duplicate);
    expect(projected.map(s=>s.id)).toEqual([...starsteles,second+' · Starstele 1',second+' · Starstele 2']);
    expect(necronBattleRoster(duplicate,projected)).toEqual(projected);
    const reordered={...duplicate,instances:[...expandRoster(duplicate)].reverse()};
    const sources=(a:typeof duplicate)=>generate11thReminders(a).filter(r=>r.title.includes('Ancient Cover')).map(r=>r.id).sort();
    expect(sources(reordered)).toEqual(sources(duplicate));
  });

  it('rolls Reanimation independently and never returns a destroyed sibling Starstele',()=>{
    const rows=generate11thReminders(army());
    const reanimation=rows.find(r=>r.id==='11e-necron-reanimation')!;
    expect(reanimation.units).toEqual(starsteles);
    expect(reanimation.summary).toMatch(/each Starstele.*separate one-model unit/i);
    expect(reanimation.summary).toMatch(/cannot return.*destroyed Starstele/i);
    expect(reanimation.summary).not.toContain('return a destroyed non-Character model');
  });

  it('offers one Starstele per unit selection and no impossible casualty-triggered Undying Legions',()=>{
    const rows=generate11thReminders({...army(),detachments2026:['Awakened Dynasty']});
    for(const id of ['11e-core-overwatch','11e-core-stratagem-limits-Shooting','11e-formation-engaged-shooting','11e-necron-awakened-tyrant']){
      expect(rows.find(r=>r.id===id)?.units,id).toEqual(starsteles);
    }
    expect(rows.filter(r=>r.id.startsWith('11e-necron-awakened-undying'))).toEqual([]);
  });

  it('keeps ordinary model restoration on Warriors while excluding independent Starsteles',()=>{
    const mixed=addSelectionUnit(army(),'Necron Warriors');
    const rows=generate11thReminders({...mixed,detachments2026:['Awakened Dynasty']});
    const reanimation=rows.find(r=>r.id==='11e-necron-reanimation')!;
    expect(reanimation.units).toEqual([...starsteles,'Necron Warriors#1']);
    expect(reanimation.summary).toContain('return a destroyed non-Character model');
    expect(reanimation.summary).toContain('cannot return another destroyed Starstele');
    for(const row of rows.filter(r=>r.id.startsWith('11e-necron-awakened-undying'))){
      expect(row.units).toEqual(['Necron Warriors#1']);
    }
  });

  it.each([
    ['Hypercrypt Legion','11e-necron-hypercrypt-hyperphasing'],
    ['Hypercrypt Legion','11e-necron-hypercrypt-deflection-Shooting'],
    ['Obeisance Phalanx','11e-necron-obeisance-nano-Shooting'],
    ['Starshatter Arsenal','11e-necron-starshatter-servitude'],
  ])('%s targets each Starstele independently for %s',(detachment,id)=>{
    const rows=generate11thReminders({...army(),detachments2026:[detachment]});
    expect(rows.find(r=>r.id===id)?.units).toEqual(starsteles);
    expect(rows.filter(r=>r.window!=='Pre-battle').some(r=>r.units?.includes(purchase))).toBe(false);
  });

  it('uses individual recipients for selected enhancements and post-deployment redeployment',()=>{
    const enhanced={...addSelectionUnit(army(),'Overlord'),detachments2026:['Starshatter Arsenal'],upgrades2026:{'Overlord#1':'Chrono-impedance Fields'}};
    const protection=generate11thReminders(enhanced).filter(r=>r.title.includes('Chrono-impedance Fields'));
    expect(protection.length).toBeGreaterThan(0);
    expect(protection.every(r=>r.units?.join()===starsteles.join())).toBe(true);
    const redeploy=generate11thReminders(addSelectionUnit(army(),'C’tan Shard of the Deceiver')).find(r=>r.title.includes('Grand Illusion'))!;
    expect(redeploy.units).toEqual([...starsteles,'C’tan Shard of the Deceiver#1']);
    expect(redeploy.summary).toContain('up to three');
  });

  it('prints each independent aura and cover source, and drops sources removed from an explicit projected roster',()=>{
    const withInfantry=addSelectionUnit(army(),'Necron Warriors');
    const rows=necronDatasheetReminders2026(withInfantry);
    for(const source of starsteles){
      const nodes=rows.filter(r=>r.title===source+' · Reanimation Nodes');
      expect(nodes.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
      expect(nodes.every(r=>r.units?.join()==='Necron Warriors#1'&&r.source.endsWith('/Convergence-Of-Dominion'))).toBe(true);
      const cover=rows.filter(r=>r.title===source+' · Ancient Cover');
      expect(cover.map(r=>r.window)).toEqual(['Shooting','Movement']);
      expect(cover.every(r=>r.units?.join()===source)).toBe(true);
    }
    expect(new Set(rows.map(r=>r.id)).size).toBe(rows.length);
    const surviving=necronBattleRoster(withInfantry).filter(s=>s.id!==starsteles[1]);
    const remaining=necronDatasheetReminders2026(withInfantry,surviving).filter(r=>r.title.includes('Reanimation Nodes'));
    expect(remaining).toHaveLength(10);
    expect(remaining.every(r=>!r.title.includes(starsteles[1]))).toBe(true);
    expect(remaining.some(r=>r.title.startsWith(starsteles[2]))).toBe(true);
  });
});
