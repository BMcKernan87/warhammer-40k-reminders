import {expect,it} from 'vitest';
import type {ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {daemonArmyReminders,eligibleDaemonUpgrades,DAEMON_DETACHMENTS} from '../src/chaos-daemon-detachments';
import {DAEMON_STRATAGEMS,DAEMON_UPGRADES} from '../src/chaos-daemon-detachments.generated';
import {DAEMONIC_PACT_SHEETS} from '../src/daemonic-pact-data.generated';
import {rosterCost2026} from '../src/datasheets-2026';

const unit=(name:string,id=name+'#1'):RosterInstance=>({unit:name,id});
function army(detachment:string,...instances:RosterInstance[]):ArmySelection {
 const units:Record<string,number>={};
 for(const s of instances)units[s.unit]=(units[s.unit]??0)+1;
 return {faction:'Chaos Daemons',detachment:'Select detachment (unverified)',detachments2026:[detachment],units,instances};
}
const rows=(force:ArmySelection,title:string)=>daemonArmyReminders(force).filter(r=>r.title===title||r.title.startsWith(title+' · '));
const names=(force:ArmySelection,unit:string,id?:string)=>eligibleDaemonUpgrades(force,unit,id).map(x=>x.name);
const full=DAEMONIC_PACT_SHEETS.map(s=>unit(s.unit));

it.each(DAEMON_DETACHMENTS.map(d=>d.name))('generates every eligible current Stratagem and upgrade on actual squads with %s',detach=>{
 const force=army(detach,...full);
 const sheet=daemonArmyReminders(force);
 for(const strat of DAEMON_STRATAGEMS.filter(s=>s.detachment===detach)){
  const out=sheet.filter(r=>r.sourceRuleId===strat.id);
  expect(out.length,strat.name).toBeGreaterThan(0);
  expect(out.every(r=>r.units?.length&&r.title.endsWith(strat.cp+'CP')&&r.summary.length>22)).toBe(true);
 }
 for(const chosen of DAEMON_UPGRADES.filter(u=>u.detachment===detach)){
  const bearer=full.find(s=>names(force,s.unit,s.id).includes(chosen.name));
  expect(bearer,chosen.name).toBeDefined();
  const chosenForce={...force,upgrades2026:{[bearer!.id]:chosen.name}};
  const out=rows(chosenForce,chosen.name);
  expect(out.length,chosen.name).toBeGreaterThan(0);
  expect(out.every(r=>r.units?.includes(bearer!.id))).toBe(true);
  expect(rows(force,chosen.name)).toHaveLength(0);
 }
 expect(new Set(sheet.map(r=>r.id)).size).toBe(sheet.length);
});
it('uses the army rule only in a native force and only lists Greater Daemons actually present',()=>{
 const khorne=unit('Bloodletters'),force=army('Warptide',khorne);
 const conditions=rows(force,'The Shadow of Chaos');
 expect(conditions.map(r=>r.window)).toEqual(['Command','Movement','Shooting','Charge','Fight']);
 expect(conditions.every(r=>r.turn==='either'&&r.timing==='start'&&r.summary.includes('contains objectives'))).toBe(true);
 expect(rows(force,'Daemonic Terror')[0].summary).not.toContain('6″');
 const greater=unit('Bloodthirster'),withAura=army('Warptide',greater,khorne);
 expect(rows(withAura,'Daemonic Terror')[0].summary).toContain('within 6″ of '+greater.id);
 expect(rows(withAura,'Daemonic Manifestation')[0].summary).toContain('non-Character');
 expect(daemonArmyReminders({...withAura,faction:'Chaos Knights'})).toEqual([]);
});
it('uses the individual prince allegiance for eligibility and detachment targeting',()=>{
 const base=unit('Daemon Prince of Chaos'),other={...unit(base.unit,base.unit+'#2'),knightGear:{'Daemonic allegiance':'Tzeentch'}};
 const force=army('Daemonic Incursion',base,other);
 expect(names(force,base.unit,base.id)).toEqual(['A’rgath, the King of Blades']);
 expect(names(force,other.unit,other.id)).toEqual(['The Everstave']);
 const blood=army('Blood Legion',base,other);
 expect(rows(blood,'Murdercall')[0].units).toEqual([base.id]);
 const mixed={...blood,upgrades2026:{[base.id]:'Brazenmaw',[other.id]:'Brazenmaw'}};
 expect(rows(mixed,'Brazenmaw').map(r=>r.units)).toEqual([[base.id]]);
 expect(names(army('Lords of the Warp',unit('Exalted Flamer')),'Exalted Flamer')).toEqual([]);
 expect(names(army('Blood Legion',unit('Skarbrand')),'Skarbrand')).toEqual([]);
});
it('applies the official 2CP first-turn ingress only to a Mounted formation, and points to the surviving bearer for attached rules',()=>{
 const master=unit('Skullmaster'),body=unit('Bloodcrushers'),solo=unit('Daemonettes');
 const force=army('Cavalcade of Chaos',{...master,attachedTo:body.id},body,solo);
 const [ingress]=rows(force,'From Beyond The Veil');
 expect(ingress.title).toContain('2CP');
 expect(ingress.turn).toBe('either'); expect(ingress.timing).toBe('end');expect(ingress.window).toBe('Movement');
 expect(ingress.units?.sort()).toEqual([body.id,master.id].sort());
 expect(ingress.summary).toContain('first turn');
 expect(rows(force,'Unholy Avalanche').map(r=>r.window)).toEqual(['Charge']);
 expect(rows(army('Cavalcade of Chaos',solo),'From Beyond The Veil')).toEqual([]);
 const bearer=unit('Bloodmaster'),letters=unit('Bloodletters');
 const attached=army('Blood Legion',{...bearer,attachedTo:letters.id},letters);
 expect(rows({...attached,upgrades2026:{[bearer.id]:'Brazenmaw'}},'Brazenmaw')[0].units?.sort()).toEqual([bearer.id,letters.id].sort());
});
it('resolves Shadow Legion effects for the correct gods and eligible allied marines',()=>{
 const prince=unit('Daemon Prince of Chaos'),belakor=unit('Be’lakor'),lord=unit('Chaos Lord'),dread=unit('Knight Despoiler');
 const slaanesh=unit('Daemonettes'),nurgle=unit('Plaguebearers'),tzeentch=unit('Pink Horrors');
 const force=army('Shadow Legion',prince,belakor,lord,dread,slaanesh,nurgle,tzeentch);
 expect(rows(force,'Shadow’s Caress')[0].units).toEqual([slaanesh.id]);
 expect(rows(force,'Gloam Rot')[0].units).toEqual([nurgle.id]);
 expect(rows(force,'Penumbral Puppetry')[0].units).toEqual([tzeentch.id]);
 expect(rows(force,'Disciples of Be’lakor · Deep Strike')[0].units).toEqual([lord.id]);
 expect(rows(force,'Disciples of Be’lakor · Dark Pacts')[0].units?.sort()).toEqual([lord.id,belakor.id].sort());
 expect(rows(force,'Thralls of the First Prince')[0].units).not.toContain(prince.id);
 expect(names(force,lord.unit,lord.id)).toContain('Fade to Darkness');
 expect(names(force,belakor.unit)).toEqual([]);
 expect(names(force,dread.unit)).toEqual([]);
});
it('uses both Fight turns and only the correct Shooting player for attack and defensive Stratagems',()=>{
 const tzeentch=unit('Flamers'),khorne=unit('Bloodletters'),force=army('Daemonic Incursion',tzeentch,khorne);
 const captures=rows(force,'Draught Of Terror');
 expect(captures.map(r=>[r.window,r.turn,r.units])).toEqual([['Shooting','own',[tzeentch.id]],['Fight','either',[tzeentch.id,khorne.id]]]);
 const nonMonster=unit('Daemonettes'),monster=unit('Keeper Of Secrets');
 const reactive=rows(army('Legion of Excess',nonMonster,monster),'Rapturous Agony');
 expect(reactive.map(r=>[r.window,r.turn,r.units])).toEqual([['Shooting','opponent',[nonMonster.id]],['Fight','either',[nonMonster.id]]]);
 const arch=rows(army('Scintillating Legion',tzeentch),'Impossible Eclipse');
 expect(arch).toEqual([]);
});
it('separates Tzeentch, terrain-independent deployment and god-specific Greater Daemon arrival bubbles',()=>{
 const blue=unit('Blue Horrors'),blood=unit('Bloodthirster'),letters=unit('Bloodletters'),altar=unit('Skull Altar');
 const force=army('Daemonic Incursion',blue,blood,letters,altar);
 const rifts=rows(force,'Warp Rifts');
 expect(rifts.find(r=>r.units?.includes(letters.id))?.summary).toContain(blood.id);
 expect(rifts.find(r=>r.units?.includes(blue.id))?.summary).not.toContain(blood.id);
 expect(rifts.every(r=>!r.units?.includes(altar.id))).toBe(true);
 const shadows=rows(army('Warptide',blue,letters),'Shudderblink');
 expect(shadows.find(r=>r.window==='Shooting')?.units).toEqual([blue.id]);
});
it('builds an actual 1,000-point native Blood Legion list with an enhanced Greater Daemon and attached herald and no ranged attack cues for its Bloodletters',()=>{
 const herald=unit('Bloodmaster'),letter1=unit('Bloodletters'),letter2=unit('Bloodletters','Bloodletters#2');
 const force=army('Blood Legion',unit('Bloodthirster'),{...herald,attachedTo:letter1.id},letter1,letter2,unit('Skull Cannon'),unit('Bloodcrushers'),unit('Flesh Hounds'),unit('Skulltaker'));
 // 320+65+110+110+100+95+80+85, plus 15 for Brazenmaw and 20 for Fury’s Cage.
 const enhanced={...force,battleSize2026:'Incursion' as const,upgrades2026:{[herald.id]:'Brazenmaw',['Bloodthirster#1']:'Fury’s Cage'}};
 const registry=DAEMONIC_PACT_SHEETS.map(s=>({...s,faction:'Chaos Daemons' as const}));
 const upgrades=enhanced.instances!.flatMap(s=>eligibleDaemonUpgrades(enhanced,s.unit,s.id).filter(u=>u.name===enhanced.upgrades2026[s.id]));
 expect(rosterCost2026(force,registry).total!+upgrades.reduce((total,u)=>total+u.points,0)).toBe(1000);
 expect(rows(enhanced,'Brazenmaw')[0].units).toContain(letter1.id);
 expect(rows(enhanced,'Brazenmaw')[0].units).not.toContain(letter2.id);
 expect(rows(enhanced,'Skulls Beget Blood')[0].units).toContain(letter1.id);
});

it('gates Shadow Legion ranged effects on the weapons actually equipped in a joined formation',()=>{
 const csm={...unit('Chaos Lord'),knightGear:{'Sidearm':'Power fist'}};
 const basic=army('Shadow Legion',unit('Bloodletters'),csm);
 const dark=(force:ArmySelection)=>rows(force,'Disciples of Be’lakor · Dark Pacts');
 expect(dark(basic).map(r=>r.window)).toEqual(['Fight']);
 expect(rows(basic,'Encroaching Darkness')).toEqual([]);
 const body=unit('Chosen');
 const grouped=army('Shadow Legion',{...csm,attachedTo:body.id},body,unit('Bloodletters'));
 expect(dark(grouped).find(r=>r.window==='Shooting')?.units?.sort()).toEqual([body.id,csm.id].sort());
 const plasma=army('Shadow Legion',unit('Chaos Lord'));
 expect(dark(plasma).find(r=>r.window==='Shooting')?.units).toEqual(['Chaos Lord#1']);
 expect(rows(plasma,'Encroaching Darkness')[0].units).toEqual(['Chaos Lord#1']);
});
