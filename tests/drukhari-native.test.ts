import {describe,it,expect} from 'vitest';
import {DRUKHARI_NATIVE_SHEETS,DRUKHARI_ALLIED_SHEETS,DRUKHARI_SHEETS,DRUKHARI_UNITS,DRUKHARI_REVISION,DRUKHARI_VOIDSCARRED_COMPOSITIONS} from '../src/drukhari-data';
import {DRUKHARI_CARDS,drukhariLoadout,validDrukhariGear,resizeDrukhariGear,drukhariModelLoadouts,drukhariWeaponCount,drukhariHasRangedWeapon} from '../src/drukhari-loadouts';
import type {RosterInstance} from '../src/roster-instances';

const squad=(unit:string,models?:number,knightGear?:Record<string,string>):RosterInstance=>({id:unit+'#1',unit,models,knightGear});
const sheet=(unit:string)=>DRUKHARI_SHEETS.find(s=>s.unit===unit)!;
function choose(unit:string,models:number,role:string,item:string,n=0){
 const fields=drukhariLoadout(unit,models)!.slots.filter(s=>s.name.startsWith(role)&&s.choices.some(c=>c.items.includes(item)));
 const field=fields[n];if(!field)throw Error('Missing field '+unit+' '+role+' '+item+' '+n);
 const choice=field.choices.find(c=>c.items.includes(item))!;
 return {[field.name]:choice.name};
}
const weapon=(unit:string,name:string)=>DRUKHARI_CARDS[unit].weapons.find(w=>w.name===name)!;

describe('current 11e Drukhari and eligible allied cards',()=>{
 it('reconciles the complete matched-play set and source revisions',()=>{
  expect(DRUKHARI_NATIVE_SHEETS.map(s=>s.unit)).toEqual(['Archon','Cronos','Drazhar','Haemonculus','Hand of the Archon','Hellions','Incubi','Kabalite Warriors','Lady Malys','Lelith Hesperax','Mandrakes','Raider','Ravager','Razorwing Jetfighter','Reavers','Scourges with Heavy Weapons','Scourges with Shardcarbines','Succubus','Talos','Venom','Voidraven Bomber','Wracks','Wyches']);
  expect(DRUKHARI_ALLIED_SHEETS.map(s=>s.unit)).toEqual(['Corsair Skyreavers','Corsair Voidreavers','Corsair Voidscarred','Death Jester','Kharseth','Prince Yriel','Shadowseer','Skyweavers','Solitaire','Starfangs','Starweaver','Troupe','Troupe Master','Voidweaver']);
  expect(DRUKHARI_UNITS).toHaveLength(37);expect(new Set(DRUKHARI_UNITS).size).toBe(37);
  expect(DRUKHARI_REVISION).toMatchObject({packVersion:'1.2',alliedPackVersion:'1.4',manual:'1.6',exportUpdated:'2026-11-23 01:43:36'});
  for(const unit of ['Urien Rakarth','Grotesques','Beastmaster','Court of the Archon','Tantalus','Reaper','Raven Strike Fighter','Corsair Cloud Dancer Band','Corsair Reaver Band'])expect(DRUKHARI_UNITS).not.toContain(unit);
  expect(DRUKHARI_NATIVE_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(48);
  expect(DRUKHARI_ALLIED_SHEETS.reduce((n,s)=>n+Object.keys(s.compositionBySize!).length,0)).toBe(39);
 });
 it('preserves actual allied faction tags and model-specific Psyker eligibility',()=>{
  for(const s of DRUKHARI_ALLIED_SHEETS){expect(s.faction).toBe('Drukhari');expect(s.keywords).not.toContain('DRUKHARI');expect(s.keywords).not.toContain('YNNARI');expect(s.keywords!.some(k=>['HARLEQUINS','ANHRATHE'].includes(k))).toBe(true);}
  expect(sheet('Corsair Voidscarred').keywords).not.toContain('PSYKER');
  expect(sheet('Corsair Voidscarred').modelKeywords).toEqual({'Way Seeker':['PSYKER']});
  expect(sheet('Troupe').keywords).not.toContain('BATTLELINE');
  expect(sheet('Corsair Voidreavers').keywords).toContain('BATTLELINE');
 });
 it('retains current native/allied Leader permissions without invented Support roles',()=>{
  expect(DRUKHARI_SHEETS.filter(s=>s.attachmentRole)).toHaveLength(10);
  expect(DRUKHARI_SHEETS.some(s=>s.attachmentRole==='support')).toBe(false);
  expect(sheet('Archon').bodyguards).toEqual(['Hand of the Archon','Incubi','Kabalite Warriors']);
  expect(sheet('Lady Malys').bodyguards).toEqual(sheet('Archon').bodyguards);
  expect(sheet('Kharseth').bodyguards).toEqual(['Corsair Voidreavers','Corsair Voidscarred']);
  expect(sheet('Troupe Master').bodyguards).toEqual(['Troupe']);
 });
 it('uses current aircraft characteristics and Frame on the three native skimmers',()=>{
  for(const unit of ['Razorwing Jetfighter','Voidraven Bomber']){expect(sheet(unit).profile).toMatchObject({move:'-',objectiveControl:'-'});expect(DRUKHARI_CARDS[unit].core).not.toContain('Hover');}
  for(const unit of ['Raider','Ravager','Venom'])expect(sheet(unit).keywords).toContain('FRAME');
  expect(sheet('Starfangs').keywords).not.toContain('TRANSPORT');
 });
 it('reconciles full weapon characteristics, conditional saves and printed multimodel profiles',()=>{
  expect(Object.values(DRUKHARI_CARDS).reduce((n,c)=>n+c.weapons.length,0)).toBe(183);
  expect(weapon('Talos','Macro-scalpel')).toMatchObject({phase:'Fight',attacks:'5',skill:'3',strength:7,ap:-2,damage:'2'});
  expect(weapon('Drazhar','Executioner’s demiklaives – dual blades')).toMatchObject({attacks:'8',skill:'2',strength:5,ap:-2,damage:'2',mode:true});
  expect(weapon('Scourges with Heavy Weapons','Dark lance')).toMatchObject({range:'36',attacks:'1',skill:'4',strength:12,ap:-3,damage:'D6+2'});
  expect(weapon('Corsair Voidscarred','Executioner')).toMatchObject({range:'18',attacks:'3',skill:'3',strength:6,ap:-2,damage:'D3',abilities:['anti-infantry 2+','psychic']});
  expect(DRUKHARI_CARDS.Archon).toMatchObject({save:2,conditionalSave:'Shadowfield'});
  expect(DRUKHARI_CARDS.Wyches).toMatchObject({save:6,meleeSave:4});
  expect(sheet('Incubi').modelProfiles).toMatchObject({Klaivex:{wounds:2},Incubi:{wounds:1}});
 });
 it('retains ten later-copy price tables and three paid weapon tables',()=>{
  expect(DRUKHARI_SHEETS.filter(s=>s.laterCopyPointsBySize)).toHaveLength(10);
  expect(sheet('Talos').pointsBySize).toEqual({1:70,2:140});
  expect(sheet('Talos').laterCopyPointsBySize).toEqual({3:{1:80,2:150}});
  expect(sheet('Starweaver').laterCopyPointsBySize).toEqual({4:{1:80}});
  expect(DRUKHARI_SHEETS.filter(s=>s.wargearPoints).map(s=>[s.unit,s.wargearPoints])).toEqual([['Ravager',{'Dark lance':5}],['Scourges with Heavy Weapons',{'Dark lance':5,'Haywire blaster':5}],['Talos',{'Twin haywire blaster':5}]]);
  expect(sheet('Wracks').pointsBySize).toEqual({5:55,8:90,10:110});
  expect(sheet('Troupe').pointsBySize).toEqual({5:85,6:100,11:190,12:205});
 });
 for(const s of DRUKHARI_SHEETS)it(s.unit+' has valid physical equipment at every published strength',()=>{
  const sizes=Object.keys(s.compositionBySize!).map(Number);
  for(const size of sizes){
   expect(validDrukhariGear(s.unit,{},size)).toBe(true);
   expect(drukhariModelLoadouts(squad(s.unit,size))).toHaveLength(size);
   expect(drukhariModelLoadouts(squad(s.unit,size)).every(m=>m.items.length>0)).toBe(true);
   expect(validDrukhariGear(s.unit,{invented:'weapon'},size)).toBe(false);
  }
  for(const w of DRUKHARI_CARDS[s.unit].weapons){
   const possible=sizes.some(size=>{
    const candidate=squad(s.unit,size);
    if(drukhariWeaponCount(candidate,w.name))return true;
    return drukhariLoadout(s.unit,size)!.slots.some(field=>field.choices.some(c=>{
     const gear={[field.name]:c.name};return validDrukhariGear(s.unit,gear,size)&&drukhariWeaponCount({...candidate,knightGear:gear},w.name)>0;
    }));
   });
   expect(possible,w.name+' is reachable on a legal physical bearer').toBe(true);
  }
 });
});

describe('Drukhari physical equipment limits',()=>{
 it('keeps all three Ravager gun mounts and their actual paid count',()=>{
  expect(drukhariWeaponCount(squad('Ravager',1),'Dark lance')).toBe(3);
  const field=drukhariLoadout('Ravager',1)!.slots[0];expect(field.choices).toHaveLength(4);
  for(let n=0;n<4;n++){const s=squad('Ravager',1,{[field.name]:field.choices[n].name});expect(drukhariWeaponCount(s,'Disintegrator cannon')).toBe(n);expect(drukhariWeaponCount(s,'Dark lance')).toBe(3-n);}
 });
 it('gives the Archon its fixed Shadowfield while Soul Trap replaces the pistol',()=>{
  const gear=choose('Archon',1,'','Soul trap');const s=squad('Archon',1,gear);
  expect(validDrukhariGear(s.unit,gear,1)).toBe(true);expect(drukhariWeaponCount(s,'Shadowfield')).toBe(1);expect(drukhariWeaponCount(s,'Huskblade')).toBe(1);expect(drukhariHasRangedWeapon(s)).toBe(false);
 });
 it('enforces four distinct Kabalite specialist weapons and keeps the Sybarite icon separate',()=>{
  const first=choose('Kabalite Warriors',10,'Kabalite Warrior','Blaster'),second=choose('Kabalite Warriors',10,'Kabalite Warrior','Blaster',1);
  expect(validDrukhariGear('Kabalite Warriors',{...first,...second},10)).toBe(false);
  const gear={...first,...choose('Kabalite Warriors',10,'Kabalite Warrior','Dark lance',1),...choose('Kabalite Warriors',10,'Kabalite Warrior','Shredder',2),...choose('Kabalite Warriors',10,'Kabalite Warrior','Splinter cannon',3),...choose('Kabalite Warriors',10,'Sybarite','Kabalite icon')};
  expect(validDrukhariGear('Kabalite Warriors',gear,10)).toBe(true);expect(drukhariWeaponCount(squad('Kabalite Warriors',10,gear),'Splinter rifle')).toBe(6);
 });
 for(const item of ['Stinger pistol','Shardcarbine','Pain sculptors','Razorflail','Stimm-needler'])it('caps the Hand of the Archon '+item+' at one physical agent',()=>{
  const first=choose('Hand of the Archon',10,'Kabalite Agents',item),second=choose('Hand of the Archon',10,'Kabalite Agents',item,1);
  expect(validDrukhariGear('Hand of the Archon',first,10)).toBe(true);expect(validDrukhariGear('Hand of the Archon',{...first,...second},10)).toBe(false);
  if(item==='Stimm-needler')expect(drukhariModelLoadouts(squad('Hand of the Archon',10,first)).find(m=>m.items.includes(item))!.items).toContain('Splinter rifle');
 });
 it('caps Hand blaster/shredder and lance/cannon as mutually exclusive single-bearer groups',()=>{
  for(const [a,b] of [['Blaster','Shredder'],['Dark lance','Splinter cannon']])expect(validDrukhariGear('Hand of the Archon',{...choose('Hand of the Archon',10,'Kabalite Agents',a),...choose('Hand of the Archon',10,'Kabalite Agents',b,1)},10)).toBe(false);
 });
 it('keeps three gladiatorial Wych weapons separate from Hekatrix options',()=>{
  const gear=Object.assign({},...[0,1,2].map(n=>choose('Wyches',10,'Wych','Gladiatorial weapons',n)));
  expect(validDrukhariGear('Wyches',gear,10)).toBe(true);expect(drukhariWeaponCount(squad('Wyches',10,gear),'Splinter pistol')).toBe(7);
  expect(validDrukhariGear('Wyches',{...gear,...choose('Wyches',10,'Wych','Gladiatorial weapons',3)},10)).toBe(false);
 });
 it('permits a Wrack special gun on the Acothyst with its separate power weapon replacement',()=>{
  const gear=choose('Wracks',5,'Acothyst','Hexrifle');const field=Object.keys(gear)[0];
  gear[field]=drukhariLoadout('Wracks',5)!.slots.find(s=>s.name===field)!.choices.find(c=>c.items.includes('Hexrifle')&&c.items.includes('Power weapon'))!.name;
  expect(validDrukhariGear('Wracks',gear,5)).toBe(true);
  expect(drukhariModelLoadouts(squad('Wracks',5,gear)).find(m=>m.model==='Acothyst')!.items).toEqual(['Hexrifle','Power weapon']);
  expect(validDrukhariGear('Wracks',{...gear,...choose('Wracks',5,'Wrack','Hexrifle')},5)).toBe(false);
 });
 it('shares Reaver special-gun and caltrops/talon allowances with the Champion',()=>{
  const gear={...choose('Reavers',3,'Arena Champion','Heat lance'),...choose('Reavers',3,'Arena Champion','Grav-talon')};
  expect(validDrukhariGear('Reavers',gear,3)).toBe(true);
  expect(validDrukhariGear('Reavers',{...gear,...choose('Reavers',3,'Reaver','Blaster')},3)).toBe(false);
  expect(validDrukhariGear('Reavers',{...gear,...choose('Reavers',3,'Reaver','Cluster caltrops')},3)).toBe(false);
  expect(validDrukhariGear('Reavers',{...gear,...choose('Reavers',6,'Reaver','Cluster caltrops')},6)).toBe(true);
 });
 it('preserves the Hellion champion optional hellglaive alongside a legal pistol replacement',()=>{
  const s=squad('Hellions',5,choose('Hellions',5,'Helliarch','Stunclaw'));
  expect(drukhariModelLoadouts(s).find(m=>m.model==='Helliarch')!.items).toEqual(expect.arrayContaining(['Hellglaive','Splinter pistol','Stunclaw','Splinter pods']));
  expect(validDrukhariGear(s.unit,s.knightGear!,5)).toBe(true);
 });
 it('resolves independent Talos arms, dual scalpels and paid ranged weapons per model',()=>{
  const gear={...choose('Talos',2,'Talos 1','Twin haywire blaster'),...choose('Talos',2,'Talos 2','Talos gauntlet')};
  expect(validDrukhariGear('Talos',gear,2)).toBe(true);
  const models=drukhariModelLoadouts(squad('Talos',2,gear));
  expect(models[0].items.filter(i=>i==='Macro-scalpel')).toHaveLength(2);
  expect(models[1].items.filter(i=>i==='Macro-scalpel')).toHaveLength(1);
  expect(drukhariWeaponCount(squad('Talos',2,gear),'Twin haywire blaster')).toBe(1);
 });
 it('keeps Incubi shrine tokens at unit scope and caps them by actual unit strength',()=>{
  const five=squad('Incubi',5,{'Incubi Shrine tokens':'Incubi Shrine token'}),ten=squad('Incubi',10,{'Incubi Shrine tokens':'2 × Incubi Shrine token'});
  expect(validDrukhariGear(five.unit,five.knightGear!,5)).toBe(true);expect(validDrukhariGear(ten.unit,ten.knightGear!,10)).toBe(true);
  expect(validDrukhariGear(ten.unit,ten.knightGear!,9)).toBe(false);
  expect(drukhariWeaponCount(ten,'Incubi Shrine token')).toBe(2);
  expect(drukhariModelLoadouts(ten)).toHaveLength(10);expect(drukhariModelLoadouts(ten).flatMap(m=>m.items)).not.toContain('Incubi Shrine token');
  expect(resizeDrukhariGear(ten,5)).toEqual({'Incubi Shrine tokens':'Incubi Shrine token'});
 });
});

describe('physical Corsair and Harlequin equipment',()=>{
 it('supports all36 valid optional-specialist compositions without phantom models',()=>{
  expect(Object.values(DRUKHARI_VOIDSCARRED_COMPOSITIONS).flat()).toHaveLength(36);
  for(const [sizeText,alternatives] of Object.entries(DRUKHARI_VOIDSCARRED_COMPOSITIONS))for(const comp of alternatives){
   const size=Number(sizeText),kit=drukhariLoadout('Corsair Voidscarred',size)!,gear:Record<string,string>={};
   const fields=kit.slots.filter(s=>s.choices.some(c=>c.name==='Way Seeker'));let field=0;
   for(const role of ['Shade Runner','Soul Weaver','Way Seeker'])if(comp[role])gear[fields[field++].name]=role;
   const s=squad('Corsair Voidscarred',size,gear),models=drukhariModelLoadouts(s);
   expect(validDrukhariGear(s.unit,gear,size)).toBe(true);expect(models).toHaveLength(size);
   for(const [role,count] of Object.entries(comp))expect(models.filter(m=>m.model===role)).toHaveLength(count);
   expect(drukhariWeaponCount(s,'Executioner')).toBe(comp['Way Seeker']);
   for(const m of models.filter(m=>['Shade Runner','Soul Weaver','Way Seeker'].includes(m.model)))expect(m.items).toContain('Close combat weapon');
  }
 });
 it('rejects duplicate optional specialists and keeps four ordinary Corsairs compulsory',()=>{
  const kit=drukhariLoadout('Corsair Voidscarred',10)!,fields=kit.slots.filter(s=>s.choices.some(c=>c.name==='Way Seeker'));
  expect(fields).toHaveLength(5);expect(drukhariLoadout('Corsair Voidscarred',5)!.slots.some(s=>s.choices.some(c=>c.name==='Way Seeker'))).toBe(false);
  expect(validDrukhariGear('Corsair Voidscarred',{[fields[0].name]:'Way Seeker',[fields[1].name]:'Way Seeker'},10)).toBe(false);
  const s=squad('Corsair Voidscarred',10,{[fields[0].name]:'Way Seeker'});
  const resized=resizeDrukhariGear(s,6);expect(drukhariModelLoadouts(squad(s.unit,6,resized)).filter(m=>m.model==='Way Seeker')).toHaveLength(1);
  expect(drukhariModelLoadouts(squad(s.unit,5,resizeDrukhariGear(s,5))).some(m=>m.model==='Way Seeker')).toBe(false);
 });
 it('enforces the Voidscarred ten-model specialist equipment thresholds',()=>{
  for(const item of ['Long rifle','Fusion pistol','Shuriken cannon','Wraithcannon']){
   const gear=choose('Corsair Voidscarred',10,'Corsair Voidscarred',item);
   expect(validDrukhariGear('Corsair Voidscarred',gear,10)).toBe(true);expect(validDrukhariGear('Corsair Voidscarred',gear,9)).toBe(false);
  }
 });
 it('limits repeated Corsair Skyreaver guns per five and preserves the Felarch on resize',()=>{
  const first=choose('Corsair Skyreavers',5,'Skyreaver ','Blaster'),second=choose('Corsair Skyreavers',5,'Skyreaver ','Blaster',1);
  expect(validDrukhariGear('Corsair Skyreavers',{...first,...second},5)).toBe(false);
  expect(validDrukhariGear('Corsair Skyreavers',{...first,...second},10)).toBe(true);
  const gun=choose('Corsair Skyreavers',5,'Skyreaver Felarch','Blast pistol');
  expect(drukhariWeaponCount(squad('Corsair Skyreavers',10,resizeDrukhariGear(squad('Corsair Skyreavers',5,gun),10)),'Blast pistol')).toBe(1);
 });
 it('shares the Troupe pistol cap between the Lead Player and ordinary Players',()=>{
  const first=choose('Troupe',6,'Lead Player','Fusion pistol'),second=choose('Troupe',6,'Player','Fusion pistol'),third=choose('Troupe',6,'Player','Fusion pistol',1);
  expect(validDrukhariGear('Troupe',{...first,...second},6)).toBe(true);expect(validDrukhariGear('Troupe',{...first,...second,...third},6)).toBe(false);
  expect(validDrukhariGear('Troupe',{...first,...second,...third},10)).toBe(true);
  expect(drukhariModelLoadouts(squad('Troupe',6)).every(m=>m.items.includes('Flip Belt'))).toBe(true);
 });
});
