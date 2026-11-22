import {test,expect,type Page} from '@playwright/test';

async function add(page:Page,unit:string,quantity=1){
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByLabel('Unit quantity').selectOption(String(quantity));
  await page.getByRole('button',{name:'Add',exact:true}).click();
}

test('edits Wraith wargear for individual squads and triggers Wraith Form only after crossing an enemy',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await page.goto('/');
  await add(page,'Canoptek Wraiths',2);
  await page.getByLabel('Particle caster in Canoptek Wraiths#2',{exact:true}).selectOption('2');
  const beamers=page.getByLabel('Transdimensional beamer in Canoptek Wraiths#2',{exact:true});
  await expect(beamers.locator('option')).toHaveCount(2);
  await beamers.selectOption('1');
  await page.reload();
  await expect(beamers).toHaveValue('1');
  await expect(page.getByLabel('Particle caster in Canoptek Wraiths#1',{exact:true})).toHaveValue('0');
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.getByRole('button',{name:'Next phase'}).click();
  await page.getByLabel('Battlefield unit').selectOption('Canoptek Wraiths#2');
  await page.getByLabel('Battlefield action',{exact:true}).selectOption('normal');
  await page.getByLabel('Moved over an enemy unit').check();
  await page.getByRole('button',{name:'Record action'}).click();
  const result=page.getByLabel('Triggered abilities');
  await expect(result.getByText('Wraith Form',{exact:true})).toBeVisible();
  await expect(result.getByText('Canoptek Wraiths#2',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(result).toHaveCount(0);
});

test('reserve arrivals use range, visibility, squad identity and the turn-use ledger after reload',async({page})=>{
  await page.goto('/');
  await add(page,'Deathmarks',2);
  await page.getByRole('button',{name:'Play reminders'}).click();
  await page.getByLabel('Roster player').selectOption('B');
  await page.getByRole('button',{name:'Next phase'}).click();
  await page.getByLabel('Battlefield unit').selectOption('enemy');
  await page.getByLabel('Battlefield action',{exact:true}).selectOption('arrival');
  await page.getByLabel('Deathmarks#1 to enemy unit (inches)',{exact:true}).fill('18');
  await page.getByLabel('Deathmarks#2 to enemy unit (inches)',{exact:true}).fill('19');
  await page.getByLabel('Visible to Deathmarks#1').check();
  await page.getByLabel('Visible to Deathmarks#2').check();
  await page.getByRole('button',{name:'Record action'}).click();
  const result=page.getByLabel('Triggered abilities');
  await expect(result.getByText('Hyperspace Hunters',{exact:true})).toBeVisible();
  await expect(result.getByText('Deathmarks#2',{exact:true})).toHaveCount(0);
  await result.getByRole('button',{name:'Use Hyperspace Hunters for Deathmarks#1'}).click();
  await expect(result.getByText('Hyperspace Hunters',{exact:true})).toHaveCount(0);
  await page.reload();
  await page.getByRole('button',{name:'Play reminders'}).click();
  await expect(result.getByText('No further modeled reminders for this action.')).toBeVisible();
});

test('shows a wargear-specific ability only in the correct equipped squad and checks Orb use',async({page})=>{
  await page.goto('/');
  await add(page,'Overlord');
  const orb=page.getByLabel('Resurrection Orb for Overlord#1',{exact:true});
  await expect(orb.locator('option[value="yes"]')).toBeDisabled();
  await page.getByLabel('Equipment for Overlord',{exact:true}).selectOption('Voidscythe');
  await orb.selectOption('yes');
  await expect(page.getByLabel('Equipment for Overlord',{exact:true}).locator('option').first()).toBeDisabled();
  await page.getByRole('button',{name:'Play reminders'}).click();
  const live=page.getByLabel('Live battlefield reminders');
  const use=live.getByRole('button',{name:'Use Resurrection Orb for Overlord#1'});
  await use.click();
  await expect(use).toHaveCount(0);
  await page.getByRole('button',{name:'Next phase'}).click();
  await expect(use).toHaveCount(0);
  page.once('dialog',dialog=>dialog.accept());
  await page.getByRole('button',{name:'New battle',exact:true}).click();
  await expect(use).toBeVisible();
});
