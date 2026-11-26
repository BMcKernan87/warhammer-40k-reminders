import {test,expect} from '@playwright/test';

test('mobile Tomb Blade wargear persists on the intended model and prints its weapon',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('./');
  await page.getByLabel('Select unit',{exact:true}).selectOption('Tomb Blades');
  await page.getByRole('button',{name:'Add',exact:true}).click();
  await page.getByRole('button',{name:'Edit equipment by model'}).click();
  await page.getByLabel('Primary weapon for model 2 in Tomb Blades#1').selectOption('Particle beamer');
  await page.getByLabel('Nebuloscope / Shadowloom for model 2 in Tomb Blades#1').selectOption('Nebuloscope');
  await page.getByRole('button',{name:'Apply model loadouts'}).click();
  await page.reload();
  await page.getByRole('button',{name:'Edit equipment by model'}).click();
  await expect(page.getByLabel('Primary weapon for model 2 in Tomb Blades#1')).toHaveValue('Particle beamer');
  await expect(page.getByLabel('Nebuloscope / Shadowloom for model 2 in Tomb Blades#1')).toHaveValue('Nebuloscope');
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.emulateMedia({media:'print'});
  await expect(page.locator('.print-sheet').getByText(/Weapons on those bearers: Particle beamer/).first()).toBeVisible();
});
