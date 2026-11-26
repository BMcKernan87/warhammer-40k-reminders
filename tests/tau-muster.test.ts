// @vitest-environment node
import {expect,it} from 'vitest';
import {addSelectionUnit,newSelection,validateSelection,type ArmySelection} from '../src/catalog';
import {rosterCost2026,verifiedUnitSizes2026} from '../src/datasheets-2026';
import {TAU_SHEETS,tauMusterUnits} from '../src/tau-data';
import {tauKeywords} from '../src/tau-keywords';
import {tauWarlordCandidates,selectTauWarlord,tauUnitLimit,resolvedTauWarlord} from '../src/tau-muster';
import {tauCargoFits,tauCargoFormations,tauFormations,tauTransportCapacity} from '../src/tau-transports';
import {tauLoadout,tauWeaponCount} from '../src/tau-loadouts';
import {individualArmy,setInstanceAttachment,setInstanceModelCount,autoAttachUnambiguousInstances} from '../src/roster-instances';
import {setKnightGear} from '../src/knight-loadouts';
import {rosterFindings} from '../src/roster-findings';
import {selectUpgrade2026} from '../src/upgrades-2026';
import {instanceBodyguards,rosterAttachmentRole,knightJoinedBodyguard} from '../src/leader-eligibility';
import {detachmentBudget} from '../src/edition-2026';
import {initialStore} from '../src/profiles';
import {openSavedArmies} from '../src/saved-armies';
import {generate11thReminders} from '../src/reminders-11th';

const id=(unit:string,n=1)=>unit+'#'+n;
function build(units:string[],size:ArmySelection['battleSize2026']='Strike Force',detachments=['Kauyon']){
 let army=individualArmy({...newSelection('T’au Empire'),detachments2026:detachments,battleSize2026:size});
 for(const unit of units)army=addSelectionUnit(army,unit);
 return army;
}
const squad=(army:ArmySelection,unit:string,n=1)=>army.instances!.find(s=>s.id===id(unit,n))!;
const join=(army:ArmySelection,leader:string,body:string,leaderCopy=1,bodyCopy=1)=>setInstanceAttachment(army,id(leader,leaderCopy),id(body,bodyCopy));
const errors=(army:ArmySelection)=>rosterFindings(army).filter(f=>f.severity==='error').map(f=>f.code);
function equip(army:ArmySelection,unit:string,items:string[],copy=1,owner=''){
 const instance=squad(army,unit,copy),options=tauLoadout(unit,instance.models)!.slots;
 const key=(values:readonly string[])=>[...values].map(v=>v.toLowerCase()).sort().join('|');
 const field=options.find(s=>s.name.startsWith(owner)&&s.choices.some(c=>key(c.items)===key(items)));
 if(!field)throw Error('Missing equipment choice '+unit+' / '+owner+' / '+items.join(', '));
 return setKnightGear(army,instance.id,field.name,field.choices.find(c=>key(c.items)===key(items))!.name);
}

it.each(TAU_SHEETS.map(s=>[s.unit,s] as const))('%s resolves every legal model count and its actual equipped point cost through the editor',(unit,sheet)=>{
 const army=build([unit]);
 for(const models of verifiedUnitSizes2026(army,unit)!){
  const selected=setInstanceModelCount(army,id(unit),models);
  expect(validateSelection(selected)).toBe(true);
  const entry=rosterCost2026(selected).entries[0];
  expect(entry.points!-(entry.wargearPoints??0)).toBe(sheet.pointsBySize![sheet.sizes.find(n=>n>=models)!]);
 }
});
it('uses current Leader permissions without creating a Support slot for an Ethereal or a Shaper',()=>{
 let army=build(['Ethereal','Cadre Fireblade','Strike Team','Darkstrider','Pathfinder Team','Commander In Enforcer Battlesuit','Crisis Sunforge Battlesuits']);
 for(const name of ['Ethereal','Cadre Fireblade','Darkstrider','Kroot War Shaper','Kroot Flesh Shaper','Kroot Trail Shaper'])expect(rosterAttachmentRole('T’au Empire',name)).toBe('leader');
 expect(instanceBodyguards(army,squad(army,'Commander In Enforcer Battlesuit'))).toEqual(['Crisis Fireknife Battlesuits','Crisis Starscythe Battlesuits','Crisis Sunforge Battlesuits']);
 army=join(army,'Ethereal','Strike Team');
 expect(()=>join(army,'Cadre Fireblade','Strike Team')).toThrow();
 expect(()=>join(army,'Darkstrider','Strike Team')).toThrow();
 army=join(army,'Darkstrider','Pathfinder Team');army=join(army,'Commander In Enforcer Battlesuit','Crisis Sunforge Battlesuits');
 expect(tauFormations(army).find(g=>g.root.unit==='Crisis Sunforge Battlesuits')?.members).toHaveLength(2);
});
it('permits two different Shapers only on a twenty-model Carnivore starting unit',()=>{
 let army=build(['Kroot War Shaper','Kroot War Shaper','Kroot Flesh Shaper','Kroot Trail Shaper','Kroot Carnivores','Kroot Farstalkers']);
 army=join(army,'Kroot War Shaper','Kroot Carnivores');
 expect(()=>join(army,'Kroot Flesh Shaper','Kroot Carnivores')).toThrow();
 army=setInstanceModelCount(army,id('Kroot Carnivores'),19);
 expect(()=>join(army,'Kroot Flesh Shaper','Kroot Carnivores')).toThrow();
 army=setInstanceModelCount(army,id('Kroot Carnivores'),20);
 expect(()=>join(army,'Kroot War Shaper','Kroot Carnivores',2)).toThrow();
 army=join(army,'Kroot Flesh Shaper','Kroot Carnivores');
 expect(tauFormations(army).find(g=>g.root.unit==='Kroot Carnivores')?.members).toHaveLength(3);
 expect(()=>join(army,'Kroot Trail Shaper','Kroot Carnivores')).toThrow();
 expect(()=>setInstanceModelCount(army,id('Kroot Carnivores'),19)).toThrow();
 army=join(army,'Kroot Trail Shaper','Kroot Farstalkers');
 expect(()=>join(army,'Kroot War Shaper','Kroot Farstalkers',2)).toThrow();
});
it('automatically resolves the unambiguous two-Shaper exception and preserves the original formation after casualties',()=>{
 let army=build(['Kroot War Shaper','Kroot Flesh Shaper','Kroot Carnivores']);
 army=setInstanceModelCount(army,id('Kroot Carnivores'),20);army=autoAttachUnambiguousInstances(army);
 for(const unit of ['Kroot War Shaper','Kroot Flesh Shaper'])expect(knightJoinedBodyguard(army,squad(army,unit))?.unit).toBe('Kroot Carnivores');
 const reduced=army.instances!.map(s=>s.unit==='Kroot Carnivores'?{...s,models:10}:s);
 expect(tauFormations(army,reduced)).toHaveLength(1);expect(tauFormations(army,reduced)[0].members).toHaveLength(3);
 const leaders=army.instances!.filter(s=>s.unit!=='Kroot Carnivores');
 expect(tauFormations(army,leaders)).toHaveLength(1);expect(tauFormations(army,leaders)[0].members.map(s=>s.unit)).toEqual(['Kroot War Shaper','Kroot Flesh Shaper']);
 expect(tauFormations(army,leaders.slice(1))[0].members).toHaveLength(1);
});
it('selects Shadowsun as mandatory Warlord and rejects the Farsight–Ethereal combination',()=>{
 let army=build(['Commander Farsight','Commander Shadowsun','Ethereal','Breacher Team']);
 army=join(army,'Ethereal','Breacher Team');
 expect(tauWarlordCandidates(army).map(s=>s.unit)).toEqual(['Commander Shadowsun']);
 expect(resolvedTauWarlord(army)?.unit).toBe('Commander Shadowsun');
 expect(()=>selectTauWarlord(army,id('Commander Farsight'))).toThrow();
 expect(errors(army)).toContain('farsight-ethereal');
 const legal=build(['Commander Farsight','Commander Shadowsun']);expect(errors(legal)).not.toContain('farsight-ethereal');
 const choice=build(['Cadre Fireblade','The Twin Lance']);expect(resolvedTauWarlord(choice)).toBeUndefined();
 expect(resolvedTauWarlord(selectTauWarlord(choice,id('The Twin Lance')))?.unit).toBe('The Twin Lance');
 expect(errors(build(['Strike Team']))).toContain('warlord-required');
});
it('applies battle-size copy limits, the actual Kroot Battleline grant, and Epic Hero uniqueness',()=>{
 const army=build(['Ethereal'],'Incursion');
 expect(tauUnitLimit(army,'Breacher Team')).toBe(4);expect(tauUnitLimit(army,'Devilfish')).toBe(4);
 expect(tauUnitLimit(army,'Kroot Carnivores')).toBe(2);expect(tauUnitLimit({...army,detachments2026:['Kroot Hunting Pack']},'Kroot Carnivores')).toBe(4);
 expect(tauUnitLimit({...army,battleSize2026:'Strike Force',detachments2026:['Kroot Hunting Pack']},'Kroot Carnivores')).toBe(6);
 expect(tauUnitLimit(army,'Commander Shadowsun')).toBe(1);expect(tauUnitLimit(army,'The Twin Lance')).toBe(1);
 for(const unit of ['Crisis Battlesuits','Aun’shi','Longstrike','Tactical Drones','Orca Dropship'])expect(tauMusterUnits(army)).not.toContain(unit);
 expect(tauMusterUnits(army)).toEqual(expect.arrayContaining(['Manta','Tiger Shark','AX-1-0 Tiger Shark','Ta’unar Supremacy Armour']));
});
it('enforces both printed detachment exclusions and canonicalizes historical selector names',()=>{
 expect(detachmentBudget('T’au Empire',['Kroot Hunting Pack','Auxiliary Cadre'],'Strike Force').valid).toBe(false);
 expect(detachmentBudget('T’au Empire',['Retaliation Cadre','Experimental Prototype Cadre'],'Strike Force').valid).toBe(false);
 expect(detachmentBudget('T’au Empire',['Kroot Hunting Pack','Advanced Acquisition Cadre'],'Strike Force').valid).toBe(true);
 expect(detachmentBudget('T’au Empire',["Mont'ka"],'Incursion').valid).toBe(true);
 expect(detachmentBudget('T’au Empire',['Auxillary Cadre'],'Incursion').valid).toBe(true);
 expect(detachmentBudget('T’au Empire',['Auxillary Cadre','Auxiliary Cadre'],'Strike Force').valid).toBe(false);
});
it('counts all attached models, excludes prohibited passengers and does not count equipment drones as models',()=>{
 let army=build(['Cadre Fireblade','Breacher Team','Darkstrider','Pathfinder Team','Devilfish','Tidewall Gunrig','Kroot Carnivores','Vespid Stingwings','Stealth Battlesuits','Commander Shadowsun','Firesight Team']);
 army=join(join(army,'Cadre Fireblade','Breacher Team'),'Darkstrider','Pathfinder Team');
 const fish=squad(army,'Devilfish'),gunrig=squad(army,'Tidewall Gunrig');
 expect(tauCargoFormations(army,fish).find(g=>g.root.unit==='Breacher Team')?.spaces).toBe(11);
 expect(tauCargoFormations(army,fish).find(g=>g.root.unit==='Pathfinder Team')?.spaces).toBe(11);
 expect(tauCargoFormations(army,fish).find(g=>g.root.unit==='Firesight Team')?.spaces).toBe(1);
 expect(tauCargoFits(army,fish,[id('Breacher Team'),id('Firesight Team')])).toBe(true);
 expect(tauCargoFits(army,gunrig,[id('Breacher Team'),id('Firesight Team')])).toBe(false);
 expect(tauCargoFits(army,fish,[id('Breacher Team'),id('Breacher Team')])).toBe(false);
 for(const unit of ['Kroot Carnivores','Vespid Stingwings','Stealth Battlesuits','Commander Shadowsun'])expect(tauCargoFormations(army,fish).map(g=>g.root.unit)).not.toContain(unit);
 expect(tauCargoFormations(army,{...fish,id:'absent'})).toEqual([]);
});
it('requires a different whole formation for every Dedicated Transport',()=>{
 const army=build(['Cadre Fireblade','Breacher Team','Devilfish','Devilfish']);
 expect(errors(army)).not.toContain('dedicated-transport-passengers');
 expect(errors(join(army,'Cadre Fireblade','Breacher Team'))).toContain('dedicated-transport-passengers');
 const orphan={...army,instances:army.instances!.map(s=>s.unit==='Cadre Fireblade'?{...s,attachedTo:'absent'}:s)};
 expect(tauCargoFormations(orphan,squad(orphan,'Devilfish')).map(g=>g.root.unit)).not.toContain('Cadre Fireblade');
});
it('treats a defence platform as equipment on one Shieldline, with its extra points and twenty-two passenger spaces',()=>{
 let army=build(['Cadre Fireblade','Ethereal','Breacher Team','Strike Team','Tidewall Shieldline']);
 army=join(join(army,'Cadre Fireblade','Breacher Team'),'Ethereal','Strike Team');
 const carrier=()=>squad(army,'Tidewall Shieldline');
 expect(tauCargoFits(army,carrier(),[id('Breacher Team'),id('Strike Team')])).toBe(false);
 army=equip(army,'Tidewall Shieldline',['Tidewall defence platform']);
 expect(verifiedUnitSizes2026(army,'Tidewall Shieldline')).toEqual([1]);
 expect(carrier().models).toBe(1);expect(tauTransportCapacity(carrier())).toMatchObject({spaces:22});
 expect(tauCargoFits(army,carrier(),[id('Breacher Team'),id('Strike Team')])).toBe(true);
 expect(rosterCost2026(army).entries.find(e=>e.unit==='Tidewall Shieldline')).toMatchObject({points:105,wargearPoints:20,models:1});
 expect(()=>setInstanceModelCount(army,id('Tidewall Shieldline'),2)).toThrow();
});
it('does not use equipped drone tokens to fill a Tiger Shark transport bay and removes the bay when replaced',()=>{
 let army=build(['Tiger Shark','Cadre Fireblade','Breacher Team']);
 expect(tauKeywords(army,squad(army,'Tiger Shark'))).toContain('TRANSPORT');
 expect(tauCargoFormations(army,squad(army,'Tiger Shark'))).toEqual([]);
 army=equip(army,'Tiger Shark',['Skyspear missile rack','Skyspear missile rack']);
 expect(tauTransportCapacity(squad(army,'Tiger Shark'))).toBeUndefined();
 expect(tauKeywords(army,squad(army,'Tiger Shark'))).not.toContain('TRANSPORT');
});
it('checks the Manta battlesuit bay against every actual model and its Shield Drone wounds',()=>{
 let army=build(['Manta','Broadside Battlesuits','Ghostkeel Battlesuit','Riptide Battlesuit','The Twin Lance','Stealth Battlesuits','Commander Shadowsun']);
 const manta=squad(army,'Manta');
 const cargo=()=>tauCargoFormations(army,manta).map(g=>g.root.unit);
 expect(cargo()).toEqual(expect.arrayContaining(['Broadside Battlesuits','The Twin Lance','Stealth Battlesuits','Commander Shadowsun']));
 expect(cargo()).not.toContain('Ghostkeel Battlesuit');expect(cargo()).not.toContain('Riptide Battlesuit');
 army=equip(army,'Broadside Battlesuits',['Shield drone']);expect(cargo()).toContain('Broadside Battlesuits');
 army=equip(army,'Broadside Battlesuits',['Shield drone','Shield drone']);
 expect(tauWeaponCount(squad(army,'Broadside Battlesuits'),'Shield drone')).toBe(2);expect(cargo()).not.toContain('Broadside Battlesuits');
});
it('keeps Manta infantry, vehicle and battlesuit capacities separate, including every attached Commander',()=>{
 let army=build(['Manta','Commander In Coldstar Battlesuit','Commander In Enforcer Battlesuit','Crisis Sunforge Battlesuits','Crisis Sunforge Battlesuits','Broadside Battlesuits','Stealth Battlesuits','Commander Shadowsun','Kroot Carnivores','Devilfish','Devilfish','Hammerhead Gunship','Hammerhead Gunship','Sky Ray Gunship']);
 army=join(army,'Commander In Coldstar Battlesuit','Crisis Sunforge Battlesuits');army=join(army,'Commander In Enforcer Battlesuit','Crisis Sunforge Battlesuits',1,2);
 const manta=squad(army,'Manta'),suits=[id('Crisis Sunforge Battlesuits'),id('Crisis Sunforge Battlesuits',2)];
 expect(tauCargoFormations(army,manta).find(g=>g.root.id===suits[0])?.spaces).toBe(4);
 expect(tauCargoFits(army,manta,suits)).toBe(true);
 expect(tauCargoFits(army,manta,[...suits,id('Broadside Battlesuits')])).toBe(false);
 expect(tauCargoFits(army,manta,[...suits,id('Stealth Battlesuits'),id('Commander Shadowsun'),id('Kroot Carnivores')])).toBe(true);
 const tanks=[id('Devilfish'),id('Devilfish',2),id('Hammerhead Gunship'),id('Hammerhead Gunship',2)];
 expect(tauCargoFits(army,manta,[...suits,...tanks,id('Kroot Carnivores')])).toBe(true);
 expect(tauCargoFits(army,manta,[...tanks,id('Sky Ray Gunship')])).toBe(false);
});
it('uses current equipment keywords without granting an Ethereal hover drone to its Bodyguard',()=>{
 let army=join(build(['Ethereal','Strike Team','Ghostkeel Battlesuit']),'Ethereal','Strike Team');
 army=equip(army,'Ethereal',['Hover drone']);
 expect(tauKeywords(army,squad(army,'Ethereal'))).toContain('FLY');expect(tauKeywords(army,squad(army,'Strike Team'))).not.toContain('FLY');
 expect(tauKeywords(army,squad(army,'Ghostkeel Battlesuit'))).toContain('SMOKE');
 army=equip(army,'Ghostkeel Battlesuit',['Battlesuit support system']);
 expect(tauKeywords(army,squad(army,'Ghostkeel Battlesuit'))).not.toContain('SMOKE');
 expect(generate11thReminders(army).find(r=>r.id==='11e-core-smokescreen')?.units??[]).not.toContain(id('Ghostkeel Battlesuit'));
});
it('grants Grenades to the actual upgraded Commander and only its joined formation',()=>{
 let army=build(['Commander In Enforcer Battlesuit','Crisis Sunforge Battlesuits','Crisis Sunforge Battlesuits'],'Strike Force',['Retaliation Cadre']);
 army=join(army,'Commander In Enforcer Battlesuit','Crisis Sunforge Battlesuits');army=selectUpgrade2026(army,id('Commander In Enforcer Battlesuit'),'Internal Grenade Racks');
 expect(tauKeywords(army,squad(army,'Commander In Enforcer Battlesuit'))).toContain('GRENADES');
 expect(tauKeywords(army,squad(army,'Crisis Sunforge Battlesuits'))).not.toContain('GRENADES');
 const explosives=generate11thReminders(army).find(r=>r.id==='11e-core-explosives')!;
 expect(explosives.units).toContain(id('Crisis Sunforge Battlesuits'));expect(explosives.units).not.toContain(id('Crisis Sunforge Battlesuits',2));
});
it('deducts compulsory Aircraft before optional reserves and never treats Manta Hover as losing Aircraft',()=>{
 const army=build(['Ethereal','Razorshark Strike Fighter','Sun Shark Bomber'],'Incursion');
 const reserve=generate11thReminders(army).find(r=>r.title==='Declare Strategic Reserves')!;
 expect(reserve.summary).toContain('After compulsory Aircraft, 190 points remain');
 expect(reserve.units).toContain(id('Ethereal'));expect(reserve.units).not.toContain(id('Razorshark Strike Fighter'));expect(reserve.units).not.toContain(id('Sun Shark Bomber'));
 const manta=build(['Ethereal','Manta']);expect(tauKeywords(manta,squad(manta,'Manta'))).toContain('AIRCRAFT');expect(errors(manta)).toContain('compulsory-reserves');
 expect(generate11thReminders(manta).find(r=>r.id==='11e-core-rapid-ingress')?.units).not.toContain(id('Manta'));
});
it('reopens old detachment spellings while preserving identities and retains ambiguous generic Crisis saves intact',()=>{
 const army=build(['Ethereal','Strike Team'],'Incursion',['Auxiliary Cadre']);
 const old=JSON.parse(JSON.stringify(initialStore(army)).replaceAll('Auxiliary Cadre','Auxillary Cadre'));
 const opened=openSavedArmies(old);expect(opened.retained).toEqual([]);
 expect(opened.store.profiles[0].army.detachments2026).toEqual(['Auxiliary Cadre']);expect(opened.store.profiles[0].army.instances).toEqual(army.instances);
 const legacy=initialStore({...newSelection('T’au Empire'),units:{'Crisis Battlesuits':1},instances:[{id:'Crisis Battlesuits#7',unit:'Crisis Battlesuits',models:3}]});
 expect(openSavedArmies(legacy).retained).toEqual(legacy.profiles);
});
