import {describe,expect,it} from 'vitest';
import {newSelection,type ArmySelection} from '../src/catalog';
import type {RosterInstance} from '../src/roster-instances';
import {SM_SHEETS} from '../src/space-marines-data';
import {spaceMarineLoadout} from '../src/space-marines-loadouts';
import {agentLoadout} from '../src/assigned-agent-loadouts';
import {SM_DETACHMENTS,SM_TRAITS,SM_STRATAGEMS,SM_UPGRADES} from '../src/space-marines-detachments.generated';
import {spaceMarineDetachmentReminders,spaceMarineUpgradeReminders} from '../src/space-marines-detachments';
import {currentSpaceMarineDetachment,spaceMarineSelectedDetachments,eligibleSpaceMarineUpgrades,selectedSpaceMarineUpgrade,spaceMarineHasDeepStrike,spaceMarineHasInfiltrators,spaceMarineScoutRange} from '../src/space-marines-upgrades';
import {spaceMarinePrintedChapter} from '../src/space-marines-muster-data';

const id=(name:string,n=1)=>name+'#'+n;
function force(detachments2026:string[],...units:string[]):ArmySelection{
 const counts:Record<string,number>={},instances=units.map(unit=>({unit,id:id(unit,counts[unit]=(counts[unit]??0)+1),models:SM_SHEETS.find(s=>s.unit===unit)?.sizes[0]}));
 return {...newSelection('Space Marines'),detachments2026,units:counts,instances};
}
const edit=(a:ArmySelection,name:string,changes:Partial<RosterInstance>):ArmySelection=>({...a,instances:a.instances!.map(s=>s.id===id(name)?{...s,...changes}:s)});
const join=(a:ArmySelection,leader:string,body:string)=>edit(a,leader,{attachedTo:id(body)});
const equip=(a:ArmySelection,name:string,upgrade:string):ArmySelection=>({...a,upgrades2026:{...a.upgrades2026,[id(name)]:upgrade}});
const squad=(a:ArmySelection,name:string)=>a.instances!.find(s=>s.id===id(name))!;
const rows=(a:ArmySelection,roster:readonly RosterInstance[]=a.instances!)=>[...spaceMarineDetachmentReminders(a,roster),...spaceMarineUpgradeReminders(a,roster)];
const by=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>rows(a,roster).filter(r=>r.sourceRuleId===rule);
const summary=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>by(a,rule,roster).map(r=>r.summary).join('\n');
const targets=(a:ArmySelection,rule:string,roster?:readonly RosterInstance[])=>new Set(by(a,rule,roster).flatMap(r=>r.units??[]));
const options=(a:ArmySelection,name:string)=>eligibleSpaceMarineUpgrades(a,name,id(name));
const chapterFor:Record<string,string>={'Black Spear Task Force':'DEATHWATCH','Deathwatch Support':'DEATHWATCH',"Medusa's Wrath":'IRON HANDS','Ceramite Sentinels':'IMPERIAL FISTS','Shadowmark Talon':'RAVEN GUARD','Forgefather’s Seekers':'SALAMANDERS','Spearpoint Task Force':'WHITE SCARS'};
const allFor=(det:string)=>SM_SHEETS.filter(s=>!spaceMarinePrintedChapter(s.unit)||spaceMarinePrintedChapter(s.unit)===(chapterFor[det]??'ULTRAMARINES')).map(s=>s.unit);

describe('current Space Marines detachment inventory',()=>{
 it('reconciles all current core, Codex chapter and Deathwatch entries',()=>{
  expect(SM_DETACHMENTS).toHaveLength(23);expect(SM_TRAITS).toHaveLength(23);expect(SM_STRATAGEMS).toHaveLength(94);expect(SM_UPGRADES).toHaveLength(61);
  expect(SM_DETACHMENTS.find(d=>d.name==='Black Spear Task Force')).toMatchObject({dp:3,disposition:'Priority Assets',additionalDispositions:['Purge the Foe']});
  expect(SM_DETACHMENTS.find(d=>d.name==='Deathwatch Support')).toMatchObject({dp:1,disposition:'Disruption'});
  expect(SM_DETACHMENTS.filter(d=>'tag' in d&&d.tag==='Doctrines').map(d=>d.name).sort()).toEqual(['Assault Brethren','Devastator Brethren','Tactical Brethren']);
  expect(SM_UPGRADES.find(u=>u.name==='Artificer Sarcophagus')).toMatchObject({points:40,repeatable:true});
  expect(SM_UPGRADES.filter(u=>u.name==='Beacon Angelis').map(u=>u.points)).toEqual([25,25]);
  expect([...SM_STRATAGEMS,...SM_UPGRADES,...SM_TRAITS].every(r=>/^[0-9a-f]{64}$/.test(r.sourceHash))).toBe(true);
  expect(SM_DETACHMENTS.some(d=>/Vow-sworn|Saga of|Wrath of the Rock|Angelic Inheritors|Boarding/.test(d.name))).toBe(false);
 });
 it.each(SM_DETACHMENTS)('executes each current trait and Stratagem in $name',det=>{
  const a=force([det.name],...allFor(det.name)),result=spaceMarineDetachmentReminders(a);
  for(const rule of [...SM_TRAITS,...SM_STRATAGEMS].filter(r=>r.detachment===det.name))expect(result.some(r=>r.sourceRuleId===rule.id),rule.name).toBe(true);
  expect(new Set(result.map(r=>r.id)).size).toBe(result.length);
  expect(result.every(r=>r.units?.length&&r.source.startsWith('https://')&&!/not yet implemented|review.*rules/i.test(r.summary))).toBe(true);
 });
 it.each(SM_UPGRADES)('implements selected $name in $detachment',u=>{
  let a=force([u.detachment],...allFor(u.detachment));
  const preferred=['000008522003','000011168002'].includes(u.id)?'Watch Master':u.id==='000010368005'?'Lieutenant with Combi-weapon':undefined;
  const bearer=preferred??a.instances!.find(s=>options(a,s.unit).some(o=>o.id===u.id))?.unit;
  expect(bearer,'eligible actual bearer for '+u.name).toBeDefined();
  a=equip(a,bearer!,u.name);
  expect(options(a,bearer!).some(o=>o.id===u.id)).toBe(true);
  expect(by(a,u.id).length,u.name).toBeGreaterThan(0);
  expect(new Set(rows(a).map(r=>r.id)).size).toBe(rows(a).length);
 });
 it('normalizes apostrophes, deduplicates selected detachments and rejects foreign or missing squads',()=>{
  const a=force(["forgefather's seekers",'Forgefather’s Seekers'],'Captain');
  expect(currentSpaceMarineDetachment(" FORGEFATHER'S SEEKERS ")).toBe('Forgefather’s Seekers');
  expect(spaceMarineSelectedDetachments(a)).toEqual(['Forgefather’s Seekers']);
  expect(rows(force([],'Captain'))).toEqual([]);expect(rows({...a,faction:'Necrons'})).toEqual([]);
  expect(eligibleSpaceMarineUpgrades(a,'Captain','missing')).toEqual([]);
 });
});

describe('actual Space Marines upgrade bearers and formation grants',()=>{
 it('gives model enhancements to Company Heroes Ancient only and excludes actual Epic models',()=>{
  const a=force(['Gladius Task Force'],'Company Heroes','Marneus Calgar','Victrix Honour Guard','Wardens of Ultramar','Captain');
  expect(options(a,'Company Heroes').find(u=>u.name==='Standard of the Emperor Ascendant')?.bearerModels).toEqual(['Ancient']);
  expect(options(a,'Company Heroes').find(u=>u.name==='Artificer Armour')?.bearerModels).toEqual(['Ancient']);
  expect(options(a,'Company Heroes').some(u=>u.name==='Adept of the Codex')).toBe(false);
  for(const unit of ['Marneus Calgar','Victrix Honour Guard','Wardens of Ultramar'])expect(options(a,unit)).toEqual([]);
  expect(summary(equip(a,'Company Heroes','Artificer Armour'),'000008353005')).toContain('actual Ancient enhancement bearer');
 });
 it('permits a repeatable unit Upgrade with eligible Victrix models, including optional Epic specialists',()=>{
  let a=force(['Assault Brethren'],'Victrix Honour Guard','Wardens of Ultramar','Marneus Calgar');
  expect(options(a,'Victrix Honour Guard').map(u=>u.name)).toContain('Furious Assault');
  const field=spaceMarineLoadout('Victrix Honour Guard',3)!.slots.find(s=>s.choices.some(c=>c.name==='Chapter Ancient'))!;
  a=edit(a,'Victrix Honour Guard',{knightGear:{[field.name]:'Chapter Ancient'}});
  expect(options(a,'Victrix Honour Guard').find(u=>u.name==='Furious Assault')).toMatchObject({repeatable:true,bearerModels:[]});
  expect(options(a,'Wardens of Ultramar')).toEqual([]);expect(options(a,'Marneus Calgar')).toEqual([]);
 });
 it('keeps Ironstorm trait eligibility broader than restricted tank Upgrades and Stratagems',()=>{
  const a=force(['Ironstorm Spearhead'],'Rhino','Land Raider','Storm Speeder Hailstrike','Redemptor Dreadnought','Captain');
  expect(targets(a,'000008477')).toEqual(new Set([id('Rhino'),id('Land Raider'),id('Storm Speeder Hailstrike')]));
  expect(targets(a,'000008479004')).toEqual(new Set([id('Land Raider')]));
  for(const name of ['Rhino','Storm Speeder Hailstrike','Redemptor Dreadnought','Captain'])expect(options(a,name)).toEqual([]);
  expect(options(a,'Land Raider').map(u=>[u.name,u.repeatable])).toEqual([['Redoubtable Machine Spirit',true],['Gunnery Honours',true]]);
 });
 it('uses actual Kill Team formation for Beacon, including recruited generic Characters',()=>{
  let a=equip(join(force(['Deathwatch Support'],'Captain','Fortis Kill Team'),'Captain','Fortis Kill Team'),'Captain','Beacon Angelis');
  expect(selectedSpaceMarineUpgrade(a,squad(a,'Captain'))?.name).toBe('Beacon Angelis');
  expect(spaceMarineHasDeepStrike(a,squad(a,'Fortis Kill Team'))).toBe(true);
  expect(targets(a,'000011168002')).toEqual(new Set([id('Fortis Kill Team')]));
  expect(spaceMarineHasDeepStrike(a,squad(a,'Fortis Kill Team'),a.instances!.filter(s=>s.unit!=='Captain'))).toBe(false);
  a=edit(a,'Captain',{attachedTo:undefined});
  expect(options(a,'Captain').some(u=>u.name==='Beacon Angelis')).toBe(true);
  expect(spaceMarineHasDeepStrike(a,squad(a,'Captain'))).toBe(false);
  expect(by(a,'000011168002')).toEqual([]);
 });
 it('blocks foreign enhancements throughout a Deathwatch Support Kill Team',()=>{
  const a=join(force(['Deathwatch Support','Assault Brethren'],'Captain','Fortis Kill Team','Intercessor Squad'),'Captain','Fortis Kill Team');
  expect(options(a,'Captain').map(u=>u.name)).toEqual(['Beacon Angelis']);
  expect(options(a,'Fortis Kill Team')).toEqual([]);
  expect(options(a,'Intercessor Squad').some(u=>u.name==='Furious Assault')).toBe(true);
 });
 it('propagates deterministic Infiltrators and Scout grants only from surviving bearers',()=>{
  let a=equip(join(force(['Shadowmark Talon'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Blackwing Shroud');
  expect(spaceMarineHasInfiltrators(a,squad(a,'Intercessor Squad'))).toBe(true);
  expect(spaceMarineHasInfiltrators(a,squad(a,'Intercessor Squad'),a.instances!.filter(s=>s.unit!=='Captain'))).toBe(false);
  a=equip(join(force(['Tacticus Attack Force'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Spearpoint War Leader');
  expect(spaceMarineScoutRange(a,squad(a,'Intercessor Squad'))).toBe(6);
  expect(spaceMarineScoutRange(a,squad(a,'Intercessor Squad'),a.instances!.filter(s=>s.unit!=='Captain'))).toBe(0);
 });
});

describe('Space Marines timing, equipment and persistent effects',()=>{
 it('retains exact own, opponent and either-player Stratagem windows',()=>{
  const a=force(['Gladius Task Force','Ironstorm Spearhead','Tacticus Attack Force'],'Captain','Land Raider','Intercessor Squad');
  const windows=(rule:string)=>by(a,rule).filter(r=>r.title.endsWith(' CP')).map(r=>[r.window,r.turn,r.timing]);
  expect(windows('000008352002')).toEqual([['Shooting','opponent','during'],['Fight','either','during']]);
  expect(windows('000011193002')).toEqual([['Shooting','own','during'],['Fight','either','during']]);
  expect(windows('000008479002')).toEqual(['Command','Movement','Shooting','Charge','Fight'].map(p=>[p,'either','during']));
 });
 it('gates Torrent and Melta rules on actual equipped weapons',()=>{
  let a=force(['Forgefather’s Seekers'],'Captain','Aggressor Squad','Infernus Squad');
  const field=spaceMarineLoadout('Aggressor Squad',3)!.slots.find(s=>s.choices.some(c=>c.name.includes('Auto Boltstorm')))!;
  const choice=field.choices.find(c=>c.name.includes('Auto Boltstorm'))!;
  a=edit(a,'Aggressor Squad',{knightGear:{[field.name]:choice.name}});
  expect(targets(a,'000010369005')).toEqual(new Set([id('Infernus Squad')]));
  expect(targets(a,'000010369002')).toEqual(new Set([id('Infernus Squad')]));
 });
 it('requires an eligible complete passenger formation for transport reactions',()=>{
  const a=force(['Gauntlet Task Force','Forgefather’s Seekers'],'Impulsor','Captain With Jump Pack','Intercessor Squad');
  expect(targets(a,'000011185002')).toEqual(new Set([id('Intercessor Squad')]));
  expect(targets(a,'000010369007')).toEqual(new Set([id('Intercessor Squad')]));
  expect(targets(a,'000011185004')).toEqual(new Set([id('Impulsor')]));
  expect(by(a,'000011185002',a.instances!.filter(s=>s.unit!=='Impulsor'))).toEqual([]);
 });
 it('counts an attached Inquisitor in whole-formation transport capacity',()=>{
  const a=join(join(force(['Gauntlet Task Force','Deathwatch Support'],'Impulsor','Decimus Kill Team','Lieutenant','Inquisitor'),'Lieutenant','Decimus Kill Team'),'Inquisitor','Decimus Kill Team');
  expect(by(a,'000011185002')).toEqual([]);
  expect(targets(a,'000011185002',a.instances!.filter(s=>s.unit!=='Inquisitor'))).toEqual(new Set([id('Decimus Kill Team')]));
 });
 it('uses actual allied Character equipment inside an eligible Astartes formation',()=>{
  let a=join(force(['Forgefather’s Seekers'],'Intercessor Squad','Inquisitor'),'Inquisitor','Intercessor Squad');
  expect(by(a,'000010369005')).toEqual([]);
  const gifts=agentLoadout('Inquisitor')!.slots.find(s=>s.name==='Inquisitorial gifts')!;
  a=edit(a,'Inquisitor',{knightGear:{[gifts.name]:gifts.choices.find(c=>c.items.includes('Psychic Shock Wave'))!.name}});
  expect(targets(a,'000010369005')).toEqual(new Set([id('Intercessor Squad')]));
  expect(by(a,'000010369005',a.instances!.filter(s=>s.unit!=='Inquisitor'))).toEqual([]);
 });
 it('does not extend short triggered effects or attacker-limited defences',()=>{
  const a=force(['Spearpoint Task Force','Gladius Task Force'],'Captain','Outrider Squad');
  expect(summary(a,'000010630003')).toContain('until phase end');
  expect(summary(a,'000010630003')).toContain('do not extend Assault into the Shooting phase');
  expect(summary(a,'000008352002')).toContain('only until that attacking enemy finishes');
  expect(summary(a,'000008352003')).toContain('does not interrupt to fight immediately');
 });
 it('uses current snap restrictions without deleting Wound-roll and Torrent benefits',()=>{
  const a=equip(force(['Ironstorm Spearhead','Tacticus Attack Force'],'Land Raider','Captain'),'Captain','Martial Paragon');
  expect(summary(a,'000008477')).toContain('Snap shooting prohibits Hit-roll re-rolls');
  const martial=by(a,'000011192002').find(r=>r.window==='Movement');
  expect(martial?.summary).toContain('one Wound-roll re-roll');expect(martial?.summary).toContain('prohibits the Hit-roll re-roll');
 });
 it('expires passive named-source benefits but preserves composition conditions',()=>{
  const a=force(["Medusa's Wrath"],'Iron Father Feirros','Intercessor Squad');
  expect(summary(a,'000011179')).toContain('one of each');
  expect(summary(a,'000011179',a.instances!.filter(s=>s.unit!=='Iron Father Feirros'))).not.toContain('one of each');
  const b=force(['Blade of Ultramar'],'Marneus Calgar','Intercessor Squad');
  expect(summary(b,'000010632',b.instances!.filter(s=>s.unit!=='Marneus Calgar'))).toContain('one additional time');
 });
 it('retains destroyed-bearer resurrection and timed Vehicle targets after source loss',()=>{
  const a=equip(join(force(['Ceramite Sentinels'],'Captain In Gravis Armour','Aggressor Squad'),'Captain In Gravis Armour','Aggressor Squad'),'Captain In Gravis Armour','Honour Indefatigable');
  expect(targets(a,'000010759002',[])).toEqual(new Set([id('Captain In Gravis Armour')]));
  expect(summary(a,'000010759002',[])).toContain('original Attached unit');
  expect(summary(a,'000010759002',[])).toContain('3 wounds');
  const b=equip(force(["Medusa's Wrath"],'Techmarine','Land Raider'),'Techmarine','Target Augury Web');
  const after=b.instances!.filter(s=>s.unit!=='Techmarine');
  expect(targets(b,'000011180002',after)).toEqual(new Set([id('Land Raider')]));
  expect(summary(b,'000011180002',after)).toContain('persists after the Techmarine');
  expect(by(b,'000011180002',after).some(r=>r.window==='Movement')).toBe(false);
 });
 it('keeps snared objectives and suppression after their original source is removed',()=>{
  const a=force(['Phobos Shadow Force'],'Infiltrator Squad');
  expect(summary(a,'000011189003',[])).toContain('even if the roll fails');
  expect(summary(a,'000011189003',[])).toContain('source is destroyed');
  const b=force(['Tactical Brethren'],'Intercessor Squad','Captain');
  expect(summary(b,'000011221003',b.instances!.filter(s=>s.unit!=='Intercessor Squad'))).toContain('source is destroyed');
 });
 it('keeps personal Fights First separate from whole-formation abilities',()=>{
  const a=equip(join(force(['Shadowmark Talon'],'Captain','Intercessor Squad'),'Captain','Intercessor Squad'),'Captain','Umbral Raptor');
  expect(summary(a,'000010466003')).toContain('every actual model has that ability');
  expect(summary(a,'000010466003')).toContain('only while every actual surviving model has Lone Operative');
 });
 it('uses current Heavy conditions and exact reactive core Stratagem timing',()=>{
  const a=equip(force(['Ironstorm Spearhead'],'Land Raider'),'Land Raider','Gunnery Honours');
  expect(by(a,'000008478003').map(r=>[r.window,r.turn])).toEqual([['Shooting','own']]);
  expect(summary(a,'000008478003')).toContain('no model in the formation moved more than 3″');
  expect(summary(a,'000008478003')).not.toContain('Remained Stationary');
  const b=equip(force(['Deathwatch Support'],'Watch Master'),'Watch Master','Beacon Angelis');
  expect(by(b,'000011168002').filter(r=>r.window==='Movement').map(r=>[r.turn,r.timing])).toEqual([['opponent','end']]);
  const d=equip(force(['Tactical Brethren'],'Captain','Intercessor Squad'),'Captain','Laurels of Vigilance');
  expect(by(d,'000011220002').filter(r=>r.window==='Charge').map(r=>[r.turn,r.timing])).toEqual([['opponent','end']]);
 });
 it('recognizes plain Captain and Techmarine physical model restrictions',()=>{
  const a=force(['Gladius Task Force',"Medusa's Wrath"],'Captain','Techmarine');
  expect(options(a,'Captain').some(u=>u.name==='Adept of the Codex')).toBe(true);
  expect(options(a,'Techmarine').some(u=>u.name==='Target Augury Web')).toBe(true);
  expect(options(a,'Techmarine').some(u=>u.name==='Adept of the Codex')).toBe(false);
  expect(options(force(['Blade of Ultramar'],'Captain'),'Captain').some(u=>u.name==='Student of the Codex')).toBe(true);
  expect(options(force(['Black Spear Task Force'],'Captain'),'Captain').some(u=>u.name==='The Thief of Secrets')).toBe(true);
  expect(options(force(['Gladius Task Force'],'Ancient'),'Ancient').some(u=>u.name==='Standard of the Emperor Ascendant')).toBe(true);
 });
});
