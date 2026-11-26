import {test,expect} from '@playwright/test';
import type {ArmySelection} from '../../src/catalog';
import {verifyPrint} from './printed-phases';

// Necron Faction Pack v1.3 (30 September 2026), p.3: Skyshroud Spearhead.
// https://assets.warhammer-community.com/eng_30-09_wh40k_faction_pack_necrons-1urphgbmpy-wbhocjbaba.pdf
// Keep the older app spelling as a real persisted input, not a second detachment.
function savedArmy(detachment:string):ArmySelection {
 return {
  faction:'Necrons',detachment:'Awakened Dynasty',battleSize2026:'Strike Force',
  detachments2026:[detachment],warlordId:'Lokhust Lord#1',
  units:{'Lokhust Lord':1,'Lokhust Heavy Destroyers':2,'Tomb Blades':2,Chronomancer:1,Immortals:1,'Canoptek Wraiths':1},
  upgrades2026:{'Tomb Blades#1':'Recursive Reanimation','Lokhust Lord#1':'Deepening Madness'},
  instances:[
   {id:'Lokhust Lord#1',unit:'Lokhust Lord',models:1,equipment:'Staff of light',attachedTo:'Lokhust Heavy Destroyers#2'},
   {id:'Lokhust Heavy Destroyers#1',unit:'Lokhust Heavy Destroyers',models:1,equipment:'Gauss destructor'},
   {id:'Lokhust Heavy Destroyers#2',unit:'Lokhust Heavy Destroyers',models:3,weaponCounts:{'Gauss destructor':2,'Enmitic exterminator':1}},
   {id:'Tomb Blades#1',unit:'Tomb Blades',models:3,
    weaponCounts:{'Twin gauss blaster':1,'Particle beamer':1,'Twin tesla carbine':1},
    wargear:{Nebuloscope:1,Shadowloom:1},modelLoadouts:[
     {primary:'Twin gauss blaster',gear:[]},
     {primary:'Particle beamer',gear:['Nebuloscope']},
     {primary:'Twin tesla carbine',gear:['Shadowloom']},
    ]},
   {id:'Tomb Blades#2',unit:'Tomb Blades',models:3,equipment:'Twin gauss blaster'},
   {id:'Chronomancer#1',unit:'Chronomancer',models:1,attachedTo:'Immortals#1'},
   {id:'Immortals#1',unit:'Immortals',models:5,equipment:'Gauss blaster'},
   {id:'Canoptek Wraiths#1',unit:'Canoptek Wraiths',models:3,equipment:'Vicious claws'},
  ],
 };
}

for(const [storedName,width] of [['Skysword Spearhead',390],['Skyshroud Spearhead',1280]] as const){
 test(`reopens ${storedName}, preserves squads and prints the current Movement rules at ${width}px`,async({page},info)=>{
  test.setTimeout(60000);
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:844});
  const army=savedArmy(storedName);
  const battle={prebattle:{resolved:true,decisions:{}},round:2,player:'B',phase:'Movement',cp:{A:3,B:4},notes:['Saved game notes'],units:[],events:[]};
  const completed=['existing-saved-checkmark'];
  await page.addInitScript(({army,battle,completed})=>{
   const key='w40k-reminders-profiles-v1';
   if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({activeId:'skyshroud-army',profiles:[
    {id:'skyshroud-army',name:'Skyshroud source check',army,battle,completed},
   ]}));
  },{army,battle,completed});
  await page.goto('./');
  await expect(page.getByLabel('Saved army',{exact:true})).toHaveValue('skyshroud-army');
  await expect(page.getByRole('checkbox',{name:/Skyshroud Spearhead/})).toBeChecked();
  await expect(page.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
  await expect(page.getByLabel('Attach squad Lokhust Lord#1',{exact:true})).toHaveValue('Lokhust Heavy Destroyers#2');
  await expect(page.getByLabel('11th upgrade for squad Tomb Blades#1',{exact:true})).toHaveValue('Recursive Reanimation');
  await expect(page.getByLabel('11th upgrade for squad Lokhust Lord#1',{exact:true})).toHaveValue('Deepening Madness');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0]);
  expect(saved.army).toEqual({...army,detachments2026:['Skyshroud Spearhead']});
  expect(saved.battle).toEqual(battle);
  expect(saved.completed).toEqual(completed);

  await page.getByLabel('Equipment for squad Tomb Blades#2',{exact:true}).selectOption('Twin tesla carbine');
  await page.reload();
  await expect(page.getByLabel('Equipment for squad Tomb Blades#2',{exact:true})).toHaveValue('Twin tesla carbine');
  await expect(page.getByLabel('Nebuloscope in Tomb Blades#1',{exact:true})).toHaveValue('1');
  await expect(page.getByLabel('Shadowloom in Tomb Blades#1',{exact:true})).toHaveValue('1');
  await page.getByRole('button',{name:'Play reminders',exact:true}).click();
  const sheet=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
  await sheet.getByLabel('Show phase').selectOption('Movement');
  await expect(sheet.getByText(/Chronomancer#1 · Timesplinter Mantle → Immortals#1/)).toBeVisible();
  await expect(sheet.getByText('Canoptek Wraiths#1 · 4+ invulnerable save',{exact:true})).toBeVisible();
  await expect(sheet.getByText('Tomb Blades#1 · Nebuloscope',{exact:true})).toBeVisible();
  await expect(sheet.getByText('Tomb Blades#1 · Shadowloom',{exact:true})).toBeVisible();
  await expect(sheet.getByText('Tomb Blades#2 · Nebuloscope',{exact:true})).toHaveCount(0);
  await expect(sheet.getByText('Tomb Blades#2 · Shadowloom',{exact:true})).toHaveCount(0);
  await expect(sheet.getByText(/Weapons on those bearers: Particle beamer/)).toBeVisible();
  await sheet.getByLabel('Show phase').selectOption('Command');
  await expect(sheet.getByText('Tomb Blades#1 · Recursive Reanimation',{exact:true})).toBeVisible();
  const recursive=sheet.locator('.check').filter({has:page.getByText('Tomb Blades#1 · Recursive Reanimation',{exact:true})});
  await expect(recursive).toContainText('Tomb Blades#1');
  await expect(recursive).not.toContainText('Tomb Blades#2');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);

  await page.emulateMedia({media:'print'});
  const printed=page.getByRole('region',{name:'Printable army reminders'});
  await expect(printed).toContainText('Skyshroud Spearhead');
  await expect(printed).not.toContainText('Skysword Spearhead');
  const movement=printed.locator('section').filter({has:page.getByRole('heading',{name:'Movement',exact:true})});
  await expect(movement).toContainText('Timesplinter Mantle');
  await expect(movement).toContainText('Canoptek Wraiths#1 · 4+ invulnerable save');
  await expect(movement).toContainText('Weapons on those bearers: Particle beamer');
  await verifyPrint(page,info);
  expect(errors).toEqual([]);
 });
}
