import { createServer } from 'vite';
const server = await createServer({
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false },
  logLevel: 'error',
  appType: 'custom',
});
try {
  const { factions } = await server.ssrLoadModule('/src/catalog.ts');
  const { coverageFor } = await server.ssrLoadModule('/src/sources.ts');
  const reports = factions.map((f) => coverageFor(f.id));
  if (process.argv.includes('--json')) console.log(JSON.stringify(reports, null, 2));
  else
    console.table(
      reports.map((r) => ({
        Faction: r.faction,
        Units: r.units,
        'With abilities': r.units - r.missingUnits.length,
        Profiles: r.units - r.missingProfiles.length,
        Detachments: r.detachments,
        'With rules': r.detachments - r.missingDetachments.length,
        'Missing links': r.missingDatasheetLinks.length,
        'Rules due for review': r.reviewDue.length,
      })),
    );
} finally {
  await server.close();
}
