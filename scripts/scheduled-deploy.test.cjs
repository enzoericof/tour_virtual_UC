const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const workflow = readFileSync(join(__dirname, '../.github/workflows/scheduled-vercel-production.yml'), 'utf8');
const source = workflow.split('          script: |\n')[1].replace(/^ {12}/gm, '');
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
const run = new AsyncFunction('github', 'context', 'core', 'fetch', 'process', 'setTimeout', 'Date', source);
const mainSha = 'a'.repeat(40), liveSha = 'b'.repeat(40);

function fixture(options = {}) {
  const calls = [], outputs = {};
  let created = false;
  const live = sha => ({ projectId: 'prj_tour', readyState: 'READY', meta: { githubCommitSha: sha } });
  const github = { rest: { repos: { getCommit: async ({ ref }) => ({ data: {
    sha: ref === 'main' ? mainSha : liveSha,
    commit: { tree: { sha: ref === 'main' || options.sameTree ? 'tree-new' : 'tree-old' } },
  } }) }, actions: { listWorkflowRuns: async () => ({ data: { workflow_runs: options.previousRuns ?? [] } }) } } };
  const summary = { addHeading() { return this; }, addRaw() { return this; }, async write() {} };
  const core = { setOutput: (key, value) => { outputs[key] = value; }, info() {}, summary };
  const fetch = async (url, init) => {
    const path = url.pathname; calls.push({ url, method: init.method, body: init.body && JSON.parse(init.body) });
    if (options.httpError) return { ok: false, status: 403 };
    let data;
    if (path === '/v9/projects/tour-virtual-uc') data = { id: 'prj_tour', name: 'tour-virtual-uc', link: { type: 'github', repoId: 123 } };
    else if (path.endsWith('/tour-virtual-uc.vercel.app')) data = live(created ? mainSha : options.sameCommit ? mainSha : liveSha);
    else if (path === '/v7/deployments') data = { deployments: options.pending ? [{ state: 'BUILDING', meta: { githubCommitSha: mainSha } }] : [] };
    else if (path === '/v13/deployments' && init.method === 'POST') { created = true; data = { id: 'dpl_test' }; }
    else if (path === '/v13/deployments/dpl_test') data = { readyState: options.buildError ? 'ERROR' : 'READY', gitSource: { sha: mainSha } };
    else throw new Error(`Unexpected URL ${url}`);
    if (options.unknownProduction && path.endsWith('/tour-virtual-uc.vercel.app')) delete data.meta;
    return { ok: true, json: async () => data };
  };
  const env = { VERCEL_TOKEN: 'test-only', DRY_RUN: options.dryRun ? 'true' : 'false' };
  if (options.noToken) delete env.VERCEL_TOKEN;
  class Clock extends Date { static now() { return Date.parse(options.now ?? '2026-11-20T17:00:00-03:00'); } }
  const context = { repo: { owner: 'enzoericof', repo: 'tour_virtual_UC' }, eventName: options.scheduled ? 'schedule' : 'workflow_dispatch', runId: 99 };
  return { calls, outputs, execute: () => run(github, context, core, fetch, { env }, callback => callback(), Clock) };
}

for (const [name, options] of [
  ['Omite un commit que ya está publicado', { sameCommit: true }],
  ['Omite un commit vacío con el mismo contenido publicado', { sameTree: true }],
  ['No duplica un deploy del mismo commit que ya está construyéndose', { pending: true }],
]) test(name, async () => {
  const scenario = fixture(options); await scenario.execute();
  assert.equal(scenario.outputs.result, 'skipped');
  assert.equal(scenario.calls.filter(c => c.method === 'POST').length, 0);
});

test('La comprobación manual no crea deployments', async () => {
  const scenario = fixture({ dryRun: true }); await scenario.execute();
  assert.equal(scenario.outputs.result, 'dry-run');
  assert.equal(scenario.calls.filter(c => c.method === 'POST').length, 0);
});

test('Despliega exactamente el commit leído de main y verifica el dominio publicado', async () => {
  const scenario = fixture(); await scenario.execute();
  const posts = scenario.calls.filter(c => c.method === 'POST');
  assert.equal(posts.length, 1);
  assert.deepEqual(posts[0].body.gitSource, { type: 'github', repoId: '123', ref: 'main', sha: mainSha });
  assert.equal(posts[0].body.target, 'production');
  assert.equal(scenario.outputs.result, 'deployed');
  assert.ok(scenario.calls.at(-1).url.pathname.endsWith('/tour-virtual-uc.vercel.app'));
});

test('Un build fallido no se registra como publicado', async () => {
  const scenario = fixture({ buildError: true });
  await assert.rejects(scenario.execute(), /falló o fue cancelado/);
  assert.equal(scenario.outputs.result, undefined);
});

for (const [name, options, pattern] of [
  ['Sin credencial no realiza solicitudes', { noToken: true }, /Falta el secreto/],
  ['Con producción desconocida no inicia un deploy', { unknownProduction: true }, /No se pudo verificar el commit/],
  ['Un error de API no inicia un deploy', { httpError: true }, /HTTP 403/],
]) test(name, async () => {
  const scenario = fixture(options);
  await assert.rejects(scenario.execute(), pattern);
  assert.equal(scenario.calls.filter(c => c.method === 'POST').length, 0);
});

test('Solo tiene disparadores programados/manuales y permisos de lectura', () => {
  assert.match(workflow, /cron: '0 \* \* \* \*'/);
  assert.match(workflow, /2026-11-20T17:00:00-03:00/);
  assert.doesNotMatch(workflow, /^  (push|pull_request):/m);
  assert.match(workflow, /contents: read/);
  assert.match(workflow, /actions: read/);
  assert.match(workflow, /cancel-in-progress: false/);
});

test('No despliega antes del primer turno de las 17:00', async () => {
  const scenario = fixture({ scheduled: true, now: '2026-11-20T16:59:00-03:00' });
  await scenario.execute();
  assert.equal(scenario.outputs.result, 'waiting');
  assert.equal(scenario.calls.length, 0);
});

for (const now of ['2026-11-20T17:00:00-03:00', '2026-11-20T22:00:00-03:00', '2026-11-21T03:00:00-03:00', '2026-11-21T18:00:00-03:00']) {
  test(`Atiende un nuevo turno de cinco horas: ${now}`, async () => {
    const previous = new Date(Date.parse(now) - 60 * 60 * 1000).toISOString();
    const scenario = fixture({ scheduled: true, now, previousRuns: [{ id: 98, head_branch: 'main', created_at: previous }] });
    await scenario.execute();
    assert.equal(scenario.outputs.result, 'deployed');
    assert.equal(scenario.calls.filter(c => c.method === 'POST').length, 1);
  });
}

test('Un turno sin cambios no permite desplegar nuevos commits una hora después', async () => {
  const scenario = fixture({ scheduled: true, now: '2026-11-20T18:00:00-03:00',
    previousRuns: [{ id: 98, head_branch: 'main', created_at: '2026-11-20T20:00:00Z' }] });
  await scenario.execute();
  assert.equal(scenario.outputs.result, 'waiting');
  assert.equal(scenario.calls.length, 0);
});

test('Recupera un turno cuyo disparador llegó con retraso', async () => {
  const scenario = fixture({ scheduled: true, now: '2026-11-20T18:00:00-03:00' });
  await scenario.execute();
  assert.equal(scenario.outputs.result, 'deployed');
});

test('Se mantienen desactivados los deploys por push sin bloquear commits de otros autores', () => {
  const config = JSON.parse(readFileSync(join(__dirname, '../vercel.json'), 'utf8'));
  assert.equal(config.git.deploymentEnabled, false);
  for (const service of Object.values(config.services)) assert.equal(service.ignoreCommand, undefined);
});
