// @vitest-environment node
import {expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import {astraProfileReminders,broodBrotherProfileReminders} from '../src/brood-brother-profiles';
import {astraMilitarumLoadout,astraMilitarumModelLoadouts} from '../src/astra-militarum-loadouts';
import {ASTRA_CARDS,ASTRA_SHEETS} from '../src/astra-militarum-data';
import type {RosterInstance} from '../src/roster-instances';
const s=(unit:string,models?:number):RosterInstance=>({unit,id:unit+'#1',models});
const army=(roster:RosterInstance[],detachment='Combined Arms'):ArmySelection=>({...newSelection('Astra Militarum'),detachments2026:[detachment],instances:roster,units:Object.fromEntries(roster.map(s=>[s.unit,1]))});
const rows=(...roster:RosterInstance[])=>astraProfileReminders(army(roster),roster);
function choose(squad:RosterInstance,role:string,choice:string){
 const slot=astraMilitarumLoadout(squad.unit,squad.models)!.slots.find(v=>v.name.includes(role)&&v.choices.some(c=>c.name===choice));
 if(!slot)throw Error(squad.unit+' missing '+role+'/'+choice);
 return {...squad,knightGear:{...squad.knightGear,[slot.name]:choice}};
}
const combatKey=(s:string)=>s.split(/\s+[–—-]\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g,'');
it.each(ASTRA_SHEETS.map(sheet=>[sheet.unit,sheet] as const))('%s uses the physical Guard profile for its actual stock bearers',(name,sheet)=>{
 const member=s(name,sheet.sizes[0]);
 const cmd=s('Cadian Command Squad'),protector=['Ogryn Bodyguard','Nork Deddog'].includes(name);
 const roster=protector?[cmd,{...member,retinueTo:cmd.id}]:[member];
 const result=rows(...roster),equipment=astraMilitarumModelLoadouts(member).flatMap(b=>b.items.map(combatKey));
 for(const gun of ASTRA_CARDS[name].weapons.filter(w=>w.mode||w.abilities.length)){
  const count=equipment.filter(k=>k===combatKey(gun.name)).length;
  const reminder=result.find(r=>r.units?.[0]===member.id&&r.window===gun.phase&&r.title.includes('weapon profiles'))?.summary??'';
  const marker=' × '+gun.name+(gun.mode?' (':' —');
  if(name==='Deathstrike'&&gun.name==='Deathstrike missile'){
   // Its designated marker/launch sequence replaces ordinary firing.
   expect(reminder).not.toContain(marker);
  }else if(count)expect(reminder).toContain(count+marker);else expect(reminder).not.toContain(marker);
 }
 expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
});
it('limits Brute shields, Slabshields and Feel No Pain to the printed physical bearer, including a valid Loyal Protector',()=>{
 const bull=choose(s('Bullgryn Squad',3),'Bullgryn 2 ·','Brute shield'),cmd=s('Cadian Command Squad');
 const ogryn={...choose(s('Ogryn Bodyguard'),'Huge knife','Slabshield'),retinueTo:cmd.id};
 const result=rows(bull,cmd,ogryn);
 expect(result.find(r=>r.title===bull.id+' · Brute Shield')?.summary).toMatch(/1 Brute Shield bearer.*4\+ invulnerable save/);
 expect(result.find(r=>r.title===bull.id+' · Slabshield')?.summary).toMatch(/2 Slabshield bearers.*Wounds characteristic of 4/);
 expect(result.find(r=>r.title===ogryn.id+' · Slabshield')).toMatchObject({units:[ogryn.id],summary:expect.stringContaining('Wounds characteristic of 7')});
 expect(result.filter(r=>r.title===ogryn.id+' · Feel No Pain 6+')).toHaveLength(5);
 expect(rows({...ogryn,retinueTo:undefined}).length).toBe(0);
});
it('separates the flying Valkyrie from the Avenger’s compulsory reserves and end-of-opponent-turn return',()=>{
 const fighter=s('Avenger Strike Fighter'),transport=s('Valkyrie'),r=rows(fighter,transport);
 expect(r.filter(v=>v.title.startsWith('Aircraft ·')).every(v=>v.units?.join('')===fighter.id)).toBe(true);
 expect(r.find(v=>v.title.includes('return to Strategic Reserves'))).toMatchObject({turn:'opponent',window:'End of opponent turn'});
 expect(r.find(v=>v.title.includes('compulsory reserves'))).toMatchObject({window:'Pre-battle'});
 expect(r.find(v=>v.title.endsWith('Hover'))?.units).toEqual([transport.id]);
 expect(r.some(v=>v.title===fighter.id+' · Damaged'&&v.summary.includes('1–5'))).toBe(true);
});
it('assigns Scion squad Deep Strike to its whole joined unit and suppresses it when an ineligible Protector joins',()=>{
 const body=s('Tempestus Scions',5),tempestor={...s('Militarum Tempestus Command Squad'),attachedTo:body.id},ogryn={...s('Ogryn Bodyguard'),retinueTo:tempestor.id};
 const yes=rows(body,tempestor),no=rows(body,tempestor,ogryn);
 expect(yes.find(r=>r.title.includes('Deep Strike')&&r.window==='Pre-battle')?.units).toEqual([body.id,tempestor.id]);
 expect(yes.find(r=>r.title.includes('Rapid Ingress'))).toMatchObject({turn:'opponent',timing:'end'});
 expect(no.some(r=>r.title.includes('Deep Strike'))).toBe(false);
});
it('emits Long-Range Scout and separates a single Survival Gear bearer from a whole Eager Advance Regiment',()=>{
 const sentinel=s('Scout Sentinels'),transport=s('Chimera'),kasrkin=s('Kasrkin');
 const a={...army([sentinel],'Designation Force'),upgrades2026:{[sentinel.id]:'Long-Range Scout'}};
 expect(astraProfileReminders(a,[sentinel]).some(r=>r.title.includes('Infiltrators'))).toBe(true);
 const officer={...s('Cadian Castellan'),attachedTo:kasrkin.id},group=[officer,kasrkin,transport];
 const survival={...army(group,'Recon Element'),upgrades2026:{[officer.id]:'Survival Gear'}};
 expect(astraProfileReminders(survival,group).find(r=>r.title.endsWith('Dedicated Transport'))?.units).toEqual([transport.id,kasrkin.id,officer.id]);
 const multi=s('Cadian Command Squad'),m={...army([multi],'Recon Element'),upgrades2026:{[multi.id]:'Survival Gear'}};
 expect(astraProfileReminders(m,[multi]).some(r=>r.title.includes('Scouts'))).toBe(false);
 const troops=s('Cadian Shock Troops',10),leader={...s('Cadian Castellan'),attachedTo:troops.id},line=[troops,leader,transport];
 const siege={...army(line,'Siege Regiment'),upgrades2026:{[leader.id]:'Eager Advance'}};
 expect(astraProfileReminders(siege,line).find(r=>r.title==='Chimera#1 · Scouts · Dedicated Transport')?.summary).toContain(troops.id+' (6″)');
});
it('prints only fitted legal Scion crew weapons on Firing Deck and the correct 52/72 host-specific roster',()=>{
 const ride=s('Chimera'),scions=s('Tempestus Scions',5),tank=s('Death Riders',5),native=army([ride,scions,tank]);
 const result=astraProfileReminders(native,native.instances!);
 expect(result.find(r=>r.title.includes('Firing Deck'))).toMatchObject({units:[ride.id,scions.id],summary:expect.stringContaining('Hot-shot lasgun')});
 expect(result.find(r=>r.units?.[0]===tank.id&&r.window==='Fight')?.summary).toMatch(/5 × Steed's savage claws — Extra Attacks/);
 const cult={...native,faction:'Genestealer Cults' as const,detachments2026:['Brood Brothers Auxilia']};
 expect(astraProfileReminders(cult,native.instances!)).toEqual([]);
 expect(broodBrotherProfileReminders(cult,native.instances!).some(r=>r.units?.includes(scions.id))).toBe(false);
});
it('recovers both purchasable Commander sponson plasma profiles for both hosts independently of its turret',()=>{
 const c=s('Leman Russ Commander');
 const slot=astraMilitarumLoadout(c.unit)!.slots.find(s=>s.choices.some(k=>k.items.filter(i=>i==='Plasma cannon').length===2))!;
 const selected={...c,knightGear:{[slot.name]:slot.choices.find(k=>k.items.filter(i=>i==='Plasma cannon').length===2)!.name}};
 for(const [generate,a] of [[astraProfileReminders,army([selected])],[broodBrotherProfileReminders,{...army([selected]),faction:'Genestealer Cults',detachments2026:['Brood Brothers Auxilia']}]] as const){
  const r=generate(a,[selected]).find(r=>r.window==='Shooting'&&r.title.includes('Ranged weapon profiles'))!;
  expect(r.summary).toMatch(/2 × Plasma cannon – standard.*Blast/);expect(r.summary).toMatch(/2 × Plasma cannon – supercharge.*Hazardous/);expect(r.summary).not.toContain('Executioner plasma cannon');
  expect(generate(a,[c]).find(r=>r.window==='Shooting'&&r.title.includes('Ranged weapon profiles'))?.summary).not.toContain('Plasma cannon');
 }
});

it('keeps Gaunt’s save off the other five Ghosts and scopes their independent fighting and concealment abilities',()=>{
 const ghost=s('Gaunt’s Ghosts'),result=rows(ghost);
 expect(result.filter(r=>r.title.includes('Invulnerable save')).every(r=>r.summary.includes('Ibram Gaunt model')&&r.summary.includes('5+'))).toBe(true);
 expect(result.find(r=>r.title.includes('Fights First'))).toMatchObject({window:'Fight',turn:'either'});
 expect(result.find(r=>r.title.endsWith('Lone Operative'))?.summary).toContain('12″');
 expect(result.find(r=>r.title.includes('Tanith Camo-cloaks'))).toMatchObject({window:'Shooting',turn:'opponent'});
});
it('includes a validated Inquisitor’s selectable gun when its bodyguard can embark in a Guard firing deck',()=>{
 const troops=s('Cadian Shock Troops',10),ride=s('Chimera'),inq={...s('Inquisitor Greyfax'),attachedTo:troops.id};
 const deck=rows(troops,ride,inq).find(r=>r.title.includes('Firing Deck'))!;
 expect(deck.units).toEqual([ride.id,troops.id,inq.id]);expect(deck.summary).toMatch(/Inquisitor Greyfax.*Castigation/);
});
