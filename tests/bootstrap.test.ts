// @vitest-environment node
import { test, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import config from '../vite.config';
test('builds the deployable entry under the GitHub Pages subpath', () => {
  expect(config.base).toBe('/warhammer-40k-reminders/');
  expect(readFileSync('index.html', 'utf8')).toMatch(/src="\/src\/main\.tsx"/);
});
