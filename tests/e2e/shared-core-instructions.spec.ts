import {test,expect,type Page} from '@playwright/test';
import {verifyPrint} from './printed-phases';

async function add(page:Page,unit:string){
 await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
 await page.getByRole('button',{name:'Add',exact:true}).click();
}
const sheet=(page:Page)=>page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
const card=(page:Page,title:string)=>sheet(page).locator('.check').filter({has:page.getByText(title,{exact:true})});
const convergence='Convergence Of Dominion#1';
const starsteles=[1,2,3].map(n=>convergence+' · Starstele '+n);

for(const [faction,width] of [['Necrons',390],['Astra Militarum',1280]] as const){
 test(`${faction} saves current rules and prints all phases at ${width}px`,async({page},info)=>{
  test.setTimeout(90_000);
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  await page.setViewportSize({width,height:844});
  await page.goto('./');
  await page.getByLabel('Army faction',{exact:true}).selectOption(faction);
  if(faction==='Necrons'){
   await page.getByRole('checkbox',{name:/Hand of the Dynasty/}).check();
   for(const unit of ['Immortals','Psychomancer','Canoptek Scarab Swarms','Monolith','Convergence Of Dominion'])await add(page,unit);
   await page.getByLabel('Models for squad '+convergence,{exact:true}).selectOption('3');
   await page.getByLabel('Warlord',{exact:true}).selectOption('Psychomancer#1');
  }else{
   await page.getByRole('checkbox',{name:/Recon Element/}).check();
   for(const unit of ['Cadian Command Squad','Cadian Shock Troops','Ogryn Bodyguard','Commissar'])await add(page,unit);
   await page.getByLabel('Attach squad Cadian Command Squad#1',{exact:true}).selectOption('Cadian Shock Troops#1');
   await page.getByLabel('Command Squad for Ogryn Bodyguard#1',{exact:true}).selectOption('Cadian Command Squad#1');
   await expect(page.getByLabel('11th upgrade for squad Ogryn Bodyguard#1',{exact:true})).toHaveCount(0);
   await page.getByLabel('11th upgrade for squad Cadian Command Squad#1',{exact:true}).selectOption('Tripwires');
   await page.getByLabel('Warlord',{exact:true}).selectOption('Cadian Command Squad#1');
  }
  await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
  await page.reload();
  if(faction==='Necrons'){
   await expect(page.getByLabel('Models for squad '+convergence,{exact:true})).toHaveValue('3');
  }else{
   await expect(page.getByLabel('Command Squad for Ogryn Bodyguard#1',{exact:true})).toHaveValue('Cadian Command Squad#1');
   await expect(page.getByLabel('11th upgrade for squad Cadian Command Squad#1',{exact:true})).toHaveValue('Tripwires');
  }
  await page.getByRole('button',{name:'Play reminders',exact:true}).click();
  if(faction==='Necrons'){
   await sheet(page).getByLabel('Show phase').selectOption('Pre-battle');
   await expect(card(page,convergence+' · Starsteles')).toContainText('Starting Strength 1');
   await sheet(page).getByLabel('Show phase').selectOption('Command');
   const reanimation=card(page,'Reanimation Protocols · D3 wounds');
   await expect(reanimation).toContainText('each Starstele is a separate one-model unit');
   for(const star of starsteles)await expect(reanimation.locator('.rule-subjects')).toContainText(star);
   await sheet(page).getByLabel('Show phase').selectOption('Movement');
   for(const star of starsteles){
    await expect(card(page,'Fire Overwatch · 1CP').locator('.rule-subjects')).toContainText(star);
    await expect(card(page,star+' · Ancient Cover').getByRole('link',{name:'Rule source',exact:true})).toHaveAttribute('href',/\/Convergence-Of-Dominion$/);
   }
  }
  await sheet(page).getByLabel('Show phase').selectOption('Charge');
  await expect(card(page,'Declare and resolve charges')).toContainText('Roll 2D6 before choosing charge targets');
  await expect(card(page,'Actions · charge restrictions')).toContainText('even if the action completed or failed');
  await sheet(page).getByLabel('Show phase').selectOption('Fight');
  await expect(card(page,'Fight step · activation order')).toContainText('starting with the active player');
  await expect(card(page,'Consolidation · mode and enemy response')).toContainText('resolves a fight immediately');
  if(faction==='Necrons'){
   await expect(card(page,'Immortals#1 · Implacable Eradication')).toContainText('When a model in this unit makes an attack.');
   await expect(card(page,'Immortals#1 · Implacable Eradication')).not.toContainText('Selected to shoot');
   await expect(card(page,'Canoptek Scarab Swarms#1 · Chittering Swarm')).toContainText('enemy unit');
   for(const star of starsteles)await expect(card(page,star+' · Reanimation Nodes').locator('.rule-subjects')).toContainText('Immortals#1');
  }
  // Completion immediately removes this row, so assert disappearance after the click.
  await card(page,'Fight step · activation order').getByRole('checkbox').click();
  await expect(card(page,'Fight step · activation order')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button',{name:'Play reminders',exact:true}).click();
  await sheet(page).getByLabel('Show phase').selectOption('Fight');
  await sheet(page).getByLabel('Show completed reminders').check();
  await expect(card(page,'Fight step · activation order').getByRole('checkbox')).toBeChecked();
  await page.screenshot({path:info.outputPath('fight-reminders.png'),fullPage:true});
  // A filtered and checked digital sheet must still print the complete action and Fight rules.
  await page.emulateMedia({media:'print'});
  const printed=page.getByRole('region',{name:'Printable army reminders'});
  await expect(printed.getByText('Actions · eligibility',{exact:true})).toHaveCount(1);
  await expect(printed.getByText('Fight step · activation order',{exact:true})).toHaveCount(1);
  if(faction==='Necrons'){
   for(const star of starsteles){
    await expect(printed.getByText(star+' · Reanimation Nodes',{exact:true})).toHaveCount(5);
    await expect(printed.getByText(star+' · Ancient Cover',{exact:true})).toHaveCount(2);
   }
   await expect(printed.getByText(convergence+' · Reanimation Nodes',{exact:true})).toHaveCount(0);
  }
  await verifyPrint(page,info);
  expect(errors).toEqual([]);
 });
}
