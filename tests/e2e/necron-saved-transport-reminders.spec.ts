import {test, expect} from '@playwright/test';
import {newSelection, type ArmySelection} from '../../src/catalog';
import {individualArmy, setInstanceAttachment} from '../../src/roster-instances';
import {setRetinue} from '../../src/necron-retinues';
import {selectWarlord} from '../../src/necron-muster-legality';
import {selectUpgrade2026} from '../../src/upgrades-2026';
import {verifyPrint} from './printed-phases';

// Same legal 1,000-point Incursion roster as the first deployment-formations
// regression: both transports, actual Aircraft, two attached formations and Scout.
// Core 09.02, 18–20 and 23; current Ghost Ark and Night Scythe datasheets.
// https://wahapedia.ru/wh40k11ed/the-rules/core-rules/
// https://wahapedia.ru/wh40k11ed/factions/necrons/Night-Scythe
function savedArmy(): ArmySelection {
  const units = ['Ghost Ark', 'Night Scythe', 'Doom Scythe', 'Necron Warriors', 'Royal Warden',
    'Canoptek Wraiths', 'Technomancer', 'Cryptothralls', 'Canoptek Doomstalker', 'Flayed Ones'];
  let army = individualArmy({...newSelection('Necrons'), units: Object.fromEntries(units.map(unit => [unit, 1]))});
  army = {...army, battleSize2026: 'Incursion', detachments2026: ['Hand of the Dynasty']};
  army = setInstanceAttachment(army, 'Royal Warden#1', 'Necron Warriors#1');
  army = setInstanceAttachment(army, 'Technomancer#1', 'Canoptek Wraiths#1');
  army = setRetinue(army, 'Cryptothralls#1', 'Canoptek Wraiths#1');
  army = selectUpgrade2026(selectWarlord(army, 'Royal Warden#1'), 'Necron Warriors#1', 'Enlivened Sentinels');
  return JSON.parse(JSON.stringify(army));
}

const passengerSubjects = 'Roster: Necron Warriors#1, Canoptek Wraiths#1, Flayed Ones#1';
const aircraftWindows = [
  ['Pre-battle', 'Aircraft · compulsory reserves'],
  ['Movement', 'Aircraft · movement'],
  ['Shooting', 'Aircraft · Plunging Fire'],
  ['Charge', 'Aircraft · charge targets'],
  ['Fight', 'Aircraft · melee targets'],
  ['End of opponent turn', 'Aircraft · return to Strategic Reserves'],
] as const;

for (const width of [390, 1280]) {
  test(`reopens the Incursion transport army and prints formation and arrival conditions at ${width}px`, async ({page}, info) => {
    test.setTimeout(60000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({width, height: 844});
    const army = savedArmy();
    const battle = {prebattle: {resolved: true, decisions: {}}, round: 1, player: 'A', phase: 'Movement', cp: {A: 3, B: 3}, notes: ['Saved Incursion army'], units: [], events: []};
    const completed = ['existing-saved-checkmark'];
    await page.addInitScript(({army, battle, completed}) => {
      const key = 'w40k-reminders-profiles-v1';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({activeId: 'necron-transports', profiles: [
        {id: 'necron-transports', name: 'Necron Incursion transports', army, battle, completed},
      ]}));
    }, {army, battle, completed});
    await page.goto('./');
    await expect(page.getByLabel('Saved army', {exact: true})).toHaveValue('necron-transports');
    await expect(page.getByLabel('2026 battle size', {exact: true})).toHaveValue('Incursion');
    await expect(page.getByRole('checkbox', {name: /Hand of the Dynasty/})).toBeChecked();
    await expect(page.getByText('Recorded 11th-edition total: 1000 points', {exact: true})).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Roster validation findings'}).getByText('ERROR', {exact: true})).toHaveCount(0);
    await expect(page.getByLabel('Equipment for Necron Warriors', {exact: true})).toHaveValue('Gauss flayer');
    await expect(page.getByLabel('Equipment for Canoptek Wraiths', {exact: true})).toHaveValue('Vicious claws');
    const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('w40k-reminders-profiles-v1')!).profiles[0]);
    expect((await stored()).army).toEqual(army);

    await page.getByLabel('Equipment for Necron Warriors', {exact: true}).selectOption('Gauss reaper');
    await page.reload();
    await expect(page.getByLabel('Equipment for Necron Warriors', {exact: true})).toHaveValue('Gauss reaper');
    await expect(page.getByLabel('Equipment for Canoptek Wraiths', {exact: true})).toHaveValue('Vicious claws');
    await expect(page.getByLabel('Attach squad Royal Warden#1', {exact: true})).toHaveValue('Necron Warriors#1');
    await expect(page.getByLabel('Attach squad Technomancer#1', {exact: true})).toHaveValue('Canoptek Wraiths#1');
    await expect(page.getByLabel('Retinue for Cryptothralls#1', {exact: true})).toHaveValue('Canoptek Wraiths#1');
    await expect(page.getByLabel('11th upgrade for squad Necron Warriors#1', {exact: true})).toHaveValue('Enlivened Sentinels');
    await expect(page.getByText('Recorded 11th-edition total: 1000 points', {exact: true})).toBeVisible();
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByRole('region', {name: 'Roster validation findings'}).getByText('ERROR', {exact: true})).toHaveCount(0);
    const reopened = await stored();
    expect(reopened.army).toEqual({...army, instances: army.instances!.map(squad => squad.id === 'Necron Warriors#1' ? {...squad, equipment: 'Gauss reaper'} : squad)});
    expect(reopened.battle).toEqual(battle);
    expect(reopened.completed).toEqual(completed);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.getByRole('button', {name: 'Play reminders', exact: true}).click();
    const sheet = page.getByRole('heading', {name: 'Phase reminders', exact: true}).locator('..');
    const card = (title: string) => sheet.locator('.check').filter({has: page.getByText(title, {exact: true})});
    const aircraft = sheet.locator('.check').filter({has: page.locator('strong').filter({hasText: /^Aircraft · /})});
    await expect(aircraft).toHaveCount(6);
    await expect(aircraft.locator('.rule-subjects')).toHaveText(Array(6).fill('Roster: Doom Scythe#1'));
    for (const [phase, title] of aircraftWindows) {
      const group = sheet.locator('section').filter({has: page.getByRole('heading', {name: phase, exact: true})});
      await expect(group.getByText(title, {exact: true})).toHaveCount(1);
    }
    const emergencies = card('Destroyed transport · emergency disembark');
    await expect(emergencies).toHaveCount(5);
    await expect(emergencies.locator('.rule-subjects')).toHaveText(Array(5).fill('Roster: Ghost Ark#1, Night Scythe#1'));
    for (const row of await emergencies.all()) await expect(row).toContainText('Set survivors wholly within 6″');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await sheet.getByLabel('Show phase').selectOption('Pre-battle');
    const declaration = card('Declare Strategic Reserves');
    await expect(declaration).toContainText('starting allowance is 500 points');
    await expect(declaration).toContainText('including units embarked in reserved transports');
    await expect(declaration).toContainText('After compulsory Aircraft, 300 points remain');
    // Only whole optional formations appear: no compulsory Doom Scythe or
    // separately listed Warden, Technomancer or joined Cryptothralls.
    await expect(declaration.locator('.rule-subjects')).toHaveText('Roster: Ghost Ark#1, Night Scythe#1, Necron Warriors#1, Canoptek Wraiths#1, Canoptek Doomstalker#1, Flayed Ones#1');
    await expect(card('Night Scythe · embarkation').locator('.rule-subjects')).toHaveText(passengerSubjects);
    const ark = card('Ghost Ark · Dedicated Transport');
    await expect(ark).toContainText('Eligible formation candidates: Necron Warriors#1.');
    await expect(ark).not.toContainText('Canoptek Wraiths#1');

    await sheet.getByLabel('Show phase').selectOption('Movement');
    const quantum = card('Night Scythe#1 · Quantum Invader');
    await expect(quantum).toContainText('Your turn · during');
    await expect(quantum).toContainText('Move Units step of your first, second or third Movement phase');
    await expect(quantum).toContainText('make an ingress move regardless of mission rules');
    await expect(quantum).not.toContainText('Reinforcements step');
    const disembark = card('Choose disembark mode');
    await expect(disembark.locator('.rule-subjects')).toHaveText(passengerSubjects);
    await expect(disembark).toContainText('Your turn · during');
    await expect(disembark).toContainText('After a Normal or ingress move this phase, use Rapid: set every model wholly within 3″');
    await expect(disembark).toContainText('After ingress also follow the transport’s placement restrictions');
    await expect(disembark).toContainText('Tactical if placement is possible: set every model wholly within 3″');
    await expect(disembark).toContainText('Combat: test Hazard per model, set every model wholly within 6″');

    await sheet.getByLabel('Show phase').selectOption('Charge');
    const restriction = card('Disembarked passengers · charge restriction');
    await expect(restriction.locator('.rule-subjects')).toHaveText(passengerSubjects);
    await expect(restriction).toContainText('Either turn · during');
    await expect(restriction).toContainText('Only if this unit made a Rapid, Combat, Emergency or Shock disembark move this turn');
    await expect(restriction).toContainText('cannot declare a charge until turn end');
    await expect(restriction).toContainText('only to the unit or split half that actually disembarked');
    await expect(restriction).toContainText('Tactical or Assault disembark does not itself impose this restriction');

    await sheet.getByLabel('Show phase').selectOption('Fight');
    const beams = card('Night Scythe#1 · Invasion Beams');
    await expect(beams.locator('.rule-subjects')).toHaveText(passengerSubjects);
    await expect(beams).toContainText('transport is empty');
    await expect(beams).toContainText('unengaged');
    await expect(beams).toContainText('wholly within 6″');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);

    await page.emulateMedia({media: 'print'});
    const printed = page.getByRole('region', {name: 'Printable army reminders'});
    await expect(printed).toBeVisible();
    const printCard = (title: string) => printed.locator('p').filter({has: page.getByText(title, {exact: true})});
    await expect(printCard('Declare Strategic Reserves')).toContainText('After compulsory Aircraft, 300 points remain');
    await expect(printCard('Night Scythe#1 · Quantum Invader')).toContainText('Your turn · during');
    await expect(printCard('Night Scythe#1 · Quantum Invader')).toContainText('Move Units step');
    await expect(printCard('Choose disembark mode')).toContainText('set every model wholly within 3″');
    await expect(printCard('Choose disembark mode')).toContainText('set every model wholly within 6″');
    await expect(printCard('Disembarked passengers · charge restriction')).toContainText('Only if this unit made a Rapid, Combat, Emergency or Shock disembark move this turn');
    await expect(printCard('Night Scythe#1 · Invasion Beams').locator('.rule-subjects')).toHaveText(passengerSubjects);
    const printedAircraft = printed.locator('p').filter({has: page.locator('strong').filter({hasText: /^Aircraft · /})});
    await expect(printedAircraft).toHaveCount(6);
    await expect(printedAircraft.locator('.rule-subjects')).toHaveText(Array(6).fill('Roster: Doom Scythe#1'));
    await verifyPrint(page, info);
    expect(errors).toEqual([]);
  });
}
