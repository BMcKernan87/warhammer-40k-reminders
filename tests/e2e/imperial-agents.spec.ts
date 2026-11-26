import {test,expect} from '@playwright/test';

test('builds, reopens and prints a 1,000-point native Imperial Agents army with separate Leader and Support effects',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.getByLabel('Army faction').selectOption('Imperial Agents');
  await page.getByLabel('2026 battle size').selectOption('Incursion');
  await page.getByRole('checkbox',{name:/Imperialis Fleet/}).check();
  for(const unit of ['Inquisitor Coteaz','Grey Knights Terminator Squad','Rogue Trader Entourage','Imperial Navy Breachers','Sanctifiers','Ministorum Priest','Sisters of Battle Squad','Imperial Rhino','Deathwatch Kill Team','Watch Captain Artemis','Culexus Assassin']){
    await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
    await page.getByRole('button',{name:'Add',exact:true}).click();
  }
  for(const [leader,body] of [['Inquisitor Coteaz','Grey Knights Terminator Squad'],['Watch Captain Artemis','Deathwatch Kill Team'],['Rogue Trader Entourage','Imperial Navy Breachers'],['Ministorum Priest','Sanctifiers']]){
    await page.getByLabel('Attach squad '+leader+'#1',{exact:true}).selectOption(body+'#1');
  }
  await page.getByLabel('Warlord',{exact:true}).selectOption('Inquisitor Coteaz#1');
  await page.getByLabel('Heavy gunner for Grey Knights Terminator Squad#1').selectOption('Psycannon');
  await page.reload();
  await expect(page.getByLabel('Warlord',{exact:true})).toHaveValue('Inquisitor Coteaz#1');
  await expect(page.getByText('Recorded 11th-edition total: 1000 points',{exact:true})).toBeVisible();
  await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.getByLabel('Show phase').selectOption('Pre-battle');
  const sheet=page.getByRole('heading',{name:'Phase reminders',exact:true}).locator('..');
  await expect(sheet.getByText('Imperial Rhino#1 · embarkation',{exact:true})).toBeVisible();
  await expect(sheet.getByText(/Rogue Trader Entourage#1 · Backroom Deals/)).toBeVisible();
  await page.emulateMedia({media:'print'});
  const print=page.getByRole('region',{name:'Printable army reminders'});
  await expect(print.getByText(/Inquisitor Coteaz#1 · Malefic Wardings/).first()).toBeVisible();
  await expect(print.locator('h3')).toContainText(['Pre-battle','Start of battle round','Start of turn','Command','Movement','Shooting','Charge','Fight','End of your turn','End of opponent turn','End of battle round']);
});
