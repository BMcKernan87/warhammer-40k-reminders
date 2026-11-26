import {test,expect,type Page} from '@playwright/test';

async function add(page:Page,unit:string){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
}
test('four identical Houndpack War Dogs keep the nominated Characters, Warlord and enhancement across a mobile reload',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.getByLabel('Army faction').selectOption('Chaos Knights');
  await page.getByRole('checkbox',{name:/Houndpack Lance/}).check();
  for(let n=0;n<4;n++)await add(page,'War Dog Brigand');
  const nomination=(n:number)=>page.getByLabel('Nominate War Dog Brigand#'+n+' as a Houndpack Character');
  await expect(nomination(4)).toBeDisabled();
  await nomination(1).uncheck();
  await nomination(4).check();
  await page.getByLabel('Warlord',{exact:true}).selectOption('War Dog Brigand#4');
  await expect(page.getByLabel('11th upgrade for squad War Dog Brigand#1',{exact:true})).toHaveCount(0);
  await page.getByLabel('11th upgrade for squad War Dog Brigand#4',{exact:true}).selectOption('Loping Predator');
  await page.reload();
  await expect(nomination(4)).toBeChecked();
  await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('War Dog Brigand#4');
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.getByLabel('Show phase').selectOption('Fight');
  const sheet=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
  const epic=sheet.locator('.check').filter({has:page.getByText('Epic Challenge · 1CP',{exact:true})});
  await expect(epic.locator('.rule-subjects')).toHaveText('Roster: War Dog Brigand#2, War Dog Brigand#3, War Dog Brigand#4');
  await page.emulateMedia({media:'print'});
  const print=page.getByRole('region',{name:'Printable army reminders'});
  await expect(print.getByText(/Loping Predator/).first()).toBeVisible();
  await expect(print.locator('h3').filter({hasText:'Pre-battle'})).toBeVisible();
});
