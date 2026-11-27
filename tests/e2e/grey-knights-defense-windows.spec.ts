import {test,expect,type Page} from '@playwright/test';
import {addSelectionUnit,newSelection} from '../../src/catalog';
import {individualArmy,setInstanceAttachment} from '../../src/roster-instances';
import {initialStore} from '../../src/profiles';
import {verifyPrint} from './printed-phases';

const sheet=(page:Page)=>page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
const card=(page:Page,title:string,turn:string,source?:string)=>{
 const row=sheet(page).locator('.check').filter({has:page.getByRole('checkbox',{name:title+' · '+turn+' · during',exact:true})});
 return source?row.filter({has:page.locator('.rule-subjects').filter({hasText:'Roster: '+source})}):row;
};

test('mobile Grey Knights retain saved defense checks across new attack windows and separate original formations',async({page},info)=>{
 test.setTimeout(90_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 let army=individualArmy({...newSelection('Grey Knights'),detachments2026:['Brotherhood Strike']});
 const units=['Grand Master Voldus','Paladin Squad','Brotherhood Librarian','Brotherhood Terminator Squad','Brotherhood Librarian','Brotherhood Terminator Squad','Brotherhood Techmarine','Stormraven Gunship'];
 for(const unit of units)army=addSelectionUnit(army,unit);
 army=setInstanceAttachment(army,'Grand Master Voldus#1','Paladin Squad#1');
 army=setInstanceAttachment(army,'Brotherhood Librarian#1','Brotherhood Terminator Squad#1');
 army=setInstanceAttachment(army,'Brotherhood Librarian#2','Brotherhood Terminator Squad#2');
 army=setInstanceAttachment(army,'Brotherhood Techmarine#1',null);
 army={...army,warlordId:'Grand Master Voldus#1'};
 const store=initialStore(army),profile=store.profiles[0];profile.name='Saved Grey Knights defenses';
 // These are the pre-change identities: displayed timing changes, stored checks survive.
 const oldSanctuary='sheet:'+JSON.stringify(['Movement','11e-gk-card:Grand Master Voldus#1:Sanctuary:Movement:own:end',['Grand Master Voldus#1','Paladin Squad#1']]);
 const oldHalo='sheet:'+JSON.stringify(['Movement','11e-gk-card:Brotherhood Librarian#1:Haloed in Soulfire:Movement:own:end',['Brotherhood Librarian#1','Brotherhood Terminator Squad#1']]);
 profile.completed=[oldSanctuary,oldHalo];
 await page.addInitScript(store=>{
  const key='w40k-reminders-profiles-v1';
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(store));
 },store);
 await page.goto('./');
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 for(const n of [1,2])await expect(page.getByLabel('Attach squad Brotherhood Librarian#'+n,{exact:true})).toHaveValue('Brotherhood Terminator Squad#'+n);
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 await expect(card(page,'Sanctuary','Your turn')).toHaveCount(0);
 await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#1')).toHaveCount(0);
 await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#2').getByRole('checkbox')).not.toBeChecked();
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,'Sanctuary','Your turn').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#1').getByRole('checkbox')).toBeChecked();
 for(const turn of ['Your turn','Opponent’s turn']){
  await expect(card(page,'Sanctuary',turn)).toContainText('Benefit of Cover');
  await expect(card(page,'Armoured Resilience',turn)).toContainText('subtract 1');
  await expect(card(page,'Armoured Resilience',turn).locator('.rule-subjects')).toHaveText('Roster: Stormraven Gunship#1');
  await expect(card(page,'Techmarine',turn)).toContainText('within 3″');
  await expect(card(page,'Techmarine',turn)).toContainText('outside 12″');
  for(const n of [1,2]){
   const halo=card(page,'Haloed in Soulfire',turn,'Brotherhood Librarian#'+n);
   await expect(halo).toContainText('within 18″');
   await expect(halo.locator('.rule-subjects')).toHaveText('Roster: Brotherhood Librarian#'+n+', Brotherhood Terminator Squad#'+n);
  }
 }
 await card(page,'Haloed in Soulfire','Opponent’s turn','Brotherhood Librarian#1').getByRole('checkbox').click();
 await page.reload();
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,'Sanctuary','Your turn').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Haloed in Soulfire','Opponent’s turn','Brotherhood Librarian#1').getByRole('checkbox')).toBeChecked();
 await expect(card(page,'Haloed in Soulfire','Opponent’s turn','Brotherhood Librarian#2').getByRole('checkbox')).not.toBeChecked();
 await card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#1').getByRole('checkbox').click();
 await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#1').getByRole('checkbox')).not.toBeChecked();
 await expect(card(page,'Haloed in Soulfire','Opponent’s turn','Brotherhood Librarian#1').getByRole('checkbox')).toBeChecked();
 await sheet(page).getByLabel('Show phase').selectOption('Shooting');
 for(const turn of ['Your turn','Opponent’s turn'])for(const title of ['Sanctuary','Armoured Resilience','Techmarine'])await expect(card(page,title,turn)).toHaveCount(1);
 for(const n of [1,2])await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#'+n)).toHaveCount(1);
 await expect(card(page,'Haloed in Soulfire','Your turn','Brotherhood Librarian#1').getByRole('checkbox')).not.toBeChecked();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0]);
 expect(saved.completed).toContain(oldSanctuary);expect(saved.completed).not.toContain(oldHalo);
 expect(saved.army.instances.map((s:{id:string})=>s.id)).toEqual(army.instances!.map(s=>s.id));
 await page.screenshot({path:info.outputPath('phase-reminders.png'),fullPage:true});
 await page.emulateMedia({media:'print'});
 const printed=page.getByRole('region',{name:'Printable army reminders'});
 await expect(printed.getByText('Sanctuary',{exact:true})).toHaveCount(5);
 await expect(printed.getByText('Armoured Resilience',{exact:true})).toHaveCount(5);
 await expect(printed.getByText('Techmarine',{exact:true})).toHaveCount(4);
 await expect(printed.getByText('Haloed in Soulfire',{exact:true})).toHaveCount(8);
 await verifyPrint(page,info);
 expect(errors).toEqual([]);
});

test('saved Grey Knights Shield of Prophecy activation and continuing checks remain separate through reload and print',async({page},info)=>{
 test.setTimeout(90_000);
 const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
 await page.setViewportSize({width:390,height:844});
 let army=individualArmy({...newSelection('Grey Knights'),detachments2026:['Augurium Task Force']});
 for(const unit of ['Grand Master','Brotherhood Terminator Squad','Brotherhood Terminator Squad','Venerable Dreadnought'])army=addSelectionUnit(army,unit);
 army=setInstanceAttachment(army,'Grand Master#1','Brotherhood Terminator Squad#1');
 army={...army,warlordId:'Grand Master#1',upgrades2026:{'Grand Master#1':'Shield of Prophecy'}};
 const store=initialStore(army),profile=store.profiles[0];profile.name='Saved Shield of Prophecy';
 const title='Grand Master#1 · Shield of Prophecy',active=title+' · active';
 const oldActivation='sheet:'+JSON.stringify(['Start of battle round','11e-gk-det-000010364003-Grand Master#1-Start of battle round-either',['Brotherhood Terminator Squad#1']]);
 profile.completed=[oldActivation];
 await page.addInitScript(store=>{
  const key='w40k-reminders-profiles-v1';
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(store));
 },store);
 await page.goto('./');
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 await expect(page.getByLabel('11th upgrade for squad Grand Master#1',{exact:true})).toHaveValue('Shield of Prophecy');
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption('Start of battle round');
 const activation=sheet(page).getByRole('checkbox',{name:title+' · Either turn · start',exact:true});
 await expect(activation).toHaveCount(0);
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(activation).toBeChecked();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 for(const turn of ['Your turn','Opponent’s turn']){
  await expect(card(page,active,turn)).toContainText('until the end of this battle round');
  await expect(card(page,active,turn).locator('.rule-subjects')).toHaveText('Roster: Brotherhood Terminator Squad#1');
  await expect(card(page,active,turn).getByRole('checkbox')).not.toBeChecked();
 }
 await card(page,active,'Your turn').getByRole('checkbox').check();
 await page.reload();
 await page.getByRole('button',{name:'Play reminders',exact:true}).click();
 await sheet(page).getByLabel('Show phase').selectOption('Movement');
 await sheet(page).getByLabel('Show completed reminders').check();
 await expect(card(page,active,'Your turn').getByRole('checkbox')).toBeChecked();
 await expect(card(page,active,'Opponent’s turn').getByRole('checkbox')).not.toBeChecked();
 await sheet(page).getByLabel('Show phase').selectOption('Shooting');
 for(const turn of ['Your turn','Opponent’s turn'])await expect(card(page,active,turn).getByRole('checkbox')).not.toBeChecked();
 await sheet(page).getByLabel('Show phase').selectOption('Fight');
 await expect(card(page,active,'Either turn')).toContainText('even if the bearer is destroyed');
 await sheet(page).getByLabel('Show phase').selectOption('Start of battle round');
 await expect(activation).toBeChecked();
 const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0]);
 expect(saved.completed).toContain(oldActivation);
 expect(saved.completed).toHaveLength(2);
 await page.screenshot({path:info.outputPath('phase-reminders.png'),fullPage:true});
 await page.emulateMedia({media:'print'});
 const printed=page.getByRole('region',{name:'Printable army reminders'});
 await expect(printed.getByText(title,{exact:true})).toHaveCount(1);
 await expect(printed.getByText(active,{exact:true})).toHaveCount(5);
 await verifyPrint(page,info);
 expect(errors).toEqual([]);
});
