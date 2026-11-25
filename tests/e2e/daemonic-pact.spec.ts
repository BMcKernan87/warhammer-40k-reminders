import {expect,test} from '@playwright/test';

test('Daemonic Pact allegiance, allied point caps and attachments survive a mobile reload',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Chaos Knights');
 await page.getByRole('checkbox',{name:/Traitoris Lance/}).check();
 await page.getByLabel('2026 battle size').selectOption('Incursion');
 const add=async(unit:string)=>{
  await page.getByLabel('Select unit',{exact:true}).selectOption(unit);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 };
 await add('Knight Ruinator');
 await add('Soul Grinder');
 await add('Nurglings');
 const imbalance=page.getByText(/Khorne has 1 non-Battleline allied unit/);
 await expect(imbalance).toBeVisible();
 const allegiance=page.getByLabel('Daemonic allegiance for Soul Grinder#1',{exact:true});
 await allegiance.selectOption('Nurgle');
 await expect(imbalance).toHaveCount(0);
 await add('Bloodmaster');
 await add('Bloodletters');
 const body=page.getByLabel('Attach squad Bloodmaster#1',{exact:true});
 await expect(body).toHaveValue('Bloodletters#1');
 await expect(page.getByText(/Daemonic Pact allies cost 400 points, exceeding the 250-point allowance/)).toBeVisible();
 await page.getByLabel('2026 battle size').selectOption('Strike Force');
 await page.reload();
 await expect(allegiance).toHaveValue('Nurgle');
 await expect(body).toHaveValue('Bloodletters#1');
 await expect(page.getByText(/exceeding the .*point allowance/)).toHaveCount(0);
 await expect(page.getByLabel('11th upgrade for squad Bloodmaster#1',{exact:true})).toHaveCount(0);
});

test('native Shadow Legion rosters use actual Warlord restrictions and persist a marine-led formation',async({page})=>{
 await page.goto('./');
 await page.getByLabel('Army faction').selectOption('Chaos Daemons');
 await page.getByRole('checkbox',{name:/Shadow Legion/}).check();
 const option=page.getByLabel('Select unit',{exact:true});
 await expect(option.locator('option',{hasText:'Skarbrand'})).toHaveCount(0);
 await expect(option.locator('option',{hasText:'Daemon Prince of Chaos'})).toHaveCount(0);
 for(const name of ['Chaos Lord','Chosen','Bloodmaster','Be’lakor']){
  await option.selectOption(name);
  await page.getByRole('button',{name:'Add',exact:true}).click();
 }
 const body=page.getByLabel('Attach squad Chaos Lord#1',{exact:true});
 await expect(body).toHaveValue('Chosen#1');
 await expect(page.getByText('Warlord: Be’lakor#1',{exact:true})).toBeVisible();
 await expect(page.getByText('Recorded 11th-edition total: 690 points',{exact:true})).toBeVisible();
 await expect(page.getByRole('region',{name:'Roster validation findings'}).getByText('ERROR',{exact:true})).toHaveCount(0);
 await page.reload();
 await expect(body).toHaveValue('Chosen#1');
 await expect(page.getByText('Warlord: Be’lakor#1',{exact:true})).toBeVisible();
});
