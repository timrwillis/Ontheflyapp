#!/usr/bin/env tsx
/**
 * On The Fly — End-to-End API Smoke Test
 * Hits the live Railway backend and validates all major flows.
 *
 * Usage:
 *   cd backend && npm run smoke
 *   SMOKE_ADMIN_PASSWORD=<pw> npm run smoke   (also runs Scenario D)
 */

const BASE_URL = 'https://ontheflyapp-production.up.railway.app';

// ── Types ─────────────────────────────────────────────────────────────────────

interface StepResult {
  scenario: string;
  step: string;
  passed: boolean;
  status: number;
  ms: number;
  error?: string;
}

// ── State ─────────────────────────────────────────────────────────────────────

const results: StepResult[] = [];
const failures: StepResult[] = [];

// ── Helper: make a request, log the outcome ───────────────────────────────────

async function req(
  step: string,
  scenario: string,
  method: string,
  path: string,
  opts: {
    body?: Record<string, unknown>;
    token?: string;
    expectedStatus?: number | number[];
  } = {}
): Promise<{ ok: boolean; status: number; data: unknown; headers: Headers; ms: number }> {
  const expectedArr = opts.expectedStatus == null
    ? [200, 201]
    : Array.isArray(opts.expectedStatus) ? opts.expectedStatus : [opts.expectedStatus];

  const reqHeaders: Record<string, string> = { 'Accept': 'application/json' };
  if (opts.body != null) reqHeaders['Content-Type'] = 'application/json';
  if (opts.token) reqHeaders['Authorization'] = `Bearer ${opts.token}`;

  const start = Date.now();
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: reqHeaders,
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    const ms = Date.now() - start;
    const error = `Network error: ${(err as Error).message}`;
    console.log(`  ❌ [ERR] ${method} ${path} (${ms}ms) — ${error}`);
    const result: StepResult = { scenario, step, passed: false, status: 0, ms, error };
    results.push(result);
    failures.push(result);
    return { ok: false, status: 0, data: null, headers: new Headers(), ms };
  }

  const ms = Date.now() - start;
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  const ok = expectedArr.includes(response.status);
  const icon = ok ? '✅' : '❌';
  console.log(`  ${icon} [${response.status}] ${method} ${path} (${ms}ms)`);
  if (!ok) {
    const body = JSON.stringify(data).slice(0, 300);
    console.log(`     └─ Expected ${expectedArr.join('|')}, got ${response.status}: ${body}`);
  }

  const result: StepResult = { scenario, step, passed: ok, status: response.status, ms };
  if (!ok) {
    result.error = `Expected ${expectedArr.join('|')}, got ${response.status}: ${JSON.stringify(data).slice(0, 250)}`;
    failures.push(result);
  }
  results.push(result);

  return { ok, status: response.status, data, headers: response.headers, ms };
}

// ── Helper: extract bearer token from sign-in/up response ────────────────────

function extractToken(data: unknown): string {
  const d = data as Record<string, unknown> | null;
  if (!d) return '';
  // better-auth returns token at various nesting levels depending on client config
  const tok =
    (d.token as string | undefined) ||
    ((d.session as Record<string, unknown> | undefined)?.token as string | undefined) ||
    ((d.data as Record<string, unknown> | undefined)?.token as string | undefined) ||
    ((d.data as Record<string, unknown> | undefined)?.session as Record<string, unknown> | undefined)?.token as string | undefined;
  return tok || '';
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀  On The Fly — API Smoke Test');
  console.log(`    Target : ${BASE_URL}`);
  console.log(`    Time   : ${new Date().toISOString()}`);
  console.log(`    Admin  : ${process.env.SMOKE_ADMIN_PASSWORD ? 'password provided (Scenario D will run)' : 'no password (set SMOKE_ADMIN_PASSWORD to run Scenario D)'}\n`);

  const ts = Date.now();
  let workerToken = '';
  let managerToken = '';
  let createdShiftId = '';
  const workerEmail = `worker-${ts}@smoketest.local`;
  const managerEmail = `manager-${ts}@smoketest.local`;

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIO A: Worker signup → onboarding → find shifts
  // ════════════════════════════════════════════════════════════════════════════
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO A  Worker signup → onboarding → find shifts');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const a1 = await req('A.1 Worker signup', 'A', 'POST', '/api/auth/sign-up/email', {
    body: { email: workerEmail, password: 'TestPass123!', name: 'Jane Smith' },
    expectedStatus: [200, 201],
  });
  if (a1.ok) {
    workerToken = extractToken(a1.data);
    if (!workerToken) {
      // Some better-auth configs need a follow-up sign-in to get the token
      console.log('     ℹ️  No token in signup body — trying sign-in...');
      const a1b = await req('A.1b Worker sign-in', 'A', 'POST', '/api/auth/sign-in/email', {
        body: { email: workerEmail, password: 'TestPass123!' },
      });
      workerToken = extractToken(a1b.data);
    }
  }

  if (!workerToken) {
    console.log('  ⏭  Scenarios A.2-A.8 skipped — no worker token\n');
  } else {
    await req('A.2 Set role → worker', 'A', 'POST', '/api/onboarding/role', {
      body: { role: 'worker' },
      token: workerToken,
    });

    await req('A.3 Worker profile', 'A', 'POST', '/api/onboarding/worker', {
      body: {
        name: 'Jane Smith',
        phone: '816-555-0001',
        city: 'Kansas City',
        bio: 'Smoke test worker — safe to delete',
        hasTransportation: true,
        preferredRadiusMiles: 15,
      },
      token: workerToken,
    });

    await req('A.4 Worker roles', 'A', 'POST', '/api/onboarding/worker/roles', {
      body: {
        roles: [
          { role: 'bartender', years_experience: 3, is_primary: true },
          { role: 'server',    years_experience: 2, is_primary: false },
          { role: 'busser',    years_experience: 1, is_primary: false },
        ],
      },
      token: workerToken,
    });

    await req('A.5 Worker availability', 'A', 'POST', '/api/onboarding/worker/availability', {
      body: {
        availabilityDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        availabilityStart: '17:00',
        availabilityEnd: '23:00',
        isAvailable: true,
      },
      token: workerToken,
    });

    await req('A.6 Complete onboarding', 'A', 'POST', '/api/onboarding/complete', {
      token: workerToken,
    });

    const a7 = await req('A.7 GET /api/shifts (find shifts)', 'A', 'GET', '/api/shifts', {
      token: workerToken,
      expectedStatus: 200,
    });

    const shifts = Array.isArray(a7.data) ? a7.data as Record<string, unknown>[] : [];
    console.log(`     ℹ️  ${shifts.length} shift(s) returned`);

    const openShift = shifts.find(s => s.status === 'open');
    if (openShift) {
      await req(`A.8 Apply to shift ${openShift.id}`, 'A', 'POST', `/api/shifts/${openShift.id}/apply`, {
        token: workerToken,
        expectedStatus: [201, 409],
      });
    } else {
      console.log('  ⏭  A.8 Apply — no open shifts in DB, skipping');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIO B: Manager signup → onboarding → post shift
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO B  Manager signup → onboarding → post shift');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const b1 = await req('B.1 Manager signup', 'B', 'POST', '/api/auth/sign-up/email', {
    body: { email: managerEmail, password: 'TestPass123!', name: 'Bob Grill' },
    expectedStatus: [200, 201],
  });
  if (b1.ok) {
    managerToken = extractToken(b1.data);
    if (!managerToken) {
      console.log('     ℹ️  No token in signup body — trying sign-in...');
      const b1b = await req('B.1b Manager sign-in', 'B', 'POST', '/api/auth/sign-in/email', {
        body: { email: managerEmail, password: 'TestPass123!' },
      });
      managerToken = extractToken(b1b.data);
    }
  }

  if (!managerToken) {
    console.log('  ⏭  Scenarios B.2-B.7 skipped — no manager token\n');
  } else {
    await req('B.2 Set role → manager', 'B', 'POST', '/api/onboarding/role', {
      body: { role: 'manager' },
      token: managerToken,
    });

    await req('B.3 Manager profile', 'B', 'POST', '/api/onboarding/manager', {
      body: { phone: '816-555-0002' },
      token: managerToken,
    });

    await req('B.4 Business profile', 'B', 'POST', '/api/onboarding/business', {
      body: {
        name: 'Smoke Test Bar & Grill',
        type: 'restaurant',
        city: 'Kansas City',
        address: '1234 Test Ave',
        phone: '816-555-0002',
        description: 'Automated smoke test — safe to delete',
      },
      token: managerToken,
    });

    await req('B.5 Complete onboarding', 'B', 'POST', '/api/onboarding/complete', {
      token: managerToken,
    });

    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);

    const b6 = await req('B.6 POST /api/shifts (create shift)', 'B', 'POST', '/api/shifts', {
      body: {
        role: 'bartender',
        workers_needed: 1,
        date: futureDate,
        start_time: '18:00',
        end_time: '23:00',
        hourly_pay_cents: 2500,
        location: 'Kansas City, MO',
        dress_code: 'Black attire',
        urgency: 'this_week',
        notes: 'Smoke test shift — safe to delete',
      },
      token: managerToken,
      expectedStatus: 201,
    });

    if (b6.ok) {
      createdShiftId = (b6.data as Record<string, unknown>)?.id as string ?? '';
    }

    const b7 = await req('B.7 GET /api/shifts/my', 'B', 'GET', '/api/shifts/my', {
      token: managerToken,
      expectedStatus: 200,
    });

    if (b7.ok && createdShiftId) {
      const myShifts = Array.isArray(b7.data) ? b7.data as Record<string, unknown>[] : [];
      const found = myShifts.find(s => s.id === createdShiftId);
      console.log(`     ℹ️  Created shift ${createdShiftId} ${found ? 'confirmed ✓' : 'NOT FOUND ⚠️'} in /shifts/my`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIO C: Cross-flow — worker sees manager's shift, applies, manager sees app
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO C  Cross-flow (worker ↔ manager)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  if (!workerToken || !managerToken || !createdShiftId) {
    console.log('  ⏭  Scenario C skipped — need worker + manager tokens and a created shift from A/B');
  } else {
    const c1 = await req('C.1 Worker GET /api/shifts', 'C', 'GET', '/api/shifts', {
      token: workerToken,
      expectedStatus: 200,
    });

    if (c1.ok) {
      const allShifts = Array.isArray(c1.data) ? c1.data as Record<string, unknown>[] : [];
      const visible = allShifts.find(s => s.id === createdShiftId);
      console.log(`     ℹ️  Manager's shift ${createdShiftId} ${visible ? 'visible to worker ✓' : 'NOT visible to worker ⚠️'}`);
    }

    const c2 = await req(`C.2 Worker applies to manager shift ${createdShiftId}`, 'C', 'POST', `/api/shifts/${createdShiftId}/apply`, {
      token: workerToken,
      expectedStatus: [201, 409],
    });

    if (c2.status === 201 || c2.status === 409) {
      const c3 = await req("C.3 Manager GET /api/shifts/:id/applications", 'C', 'GET', `/api/shifts/${createdShiftId}/applications`, {
        token: managerToken,
        expectedStatus: 200,
      });

      if (c3.ok) {
        const apps = ((c3.data as Record<string, unknown>)?.applications as unknown[]) ?? [];
        console.log(`     ℹ️  ${apps.length} application(s) found for shift`);
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIO D: Admin endpoints
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO D  Admin endpoints');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const adminPassword = process.env.SMOKE_ADMIN_PASSWORD;
  let adminToken = '';

  if (!adminPassword) {
    console.log('  ⏭  Scenario D skipped — set SMOKE_ADMIN_PASSWORD env var to run');
  } else {
    const d1 = await req('D.1 Admin sign-in', 'D', 'POST', '/api/auth/sign-in/email', {
      body: { email: 'timrwillis@gmail.com', password: adminPassword },
    });
    if (d1.ok) adminToken = extractToken(d1.data);

    if (!adminToken) {
      console.log('  ⏭  D.2-D.4b skipped — admin sign-in produced no token');
    } else {
      await req('D.2 force-complete-onboarding (admin ✓)', 'D', 'POST', '/api/admin/force-complete-onboarding', {
        token: adminToken,
        expectedStatus: 200,
      });

      await req('D.3 seed-demo-business (admin ✓)', 'D', 'POST', '/api/admin/seed-demo-business', {
        token: adminToken,
        expectedStatus: 200,
      });

      if (workerToken) {
        await req('D.4a force-complete-onboarding (worker → expect 403)', 'D', 'POST', '/api/admin/force-complete-onboarding', {
          token: workerToken,
          expectedStatus: 403,
        });

        await req('D.4b seed-demo-business (worker → expect 403)', 'D', 'POST', '/api/admin/seed-demo-business', {
          token: workerToken,
          expectedStatus: 403,
        });
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIO E: Rush shift end-to-end (requires SMOKE_ADMIN_PASSWORD)
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO E  Rush shift end-to-end');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const workerAEmail = `rush-workerA-${ts}@smoketest.local`;
  const workerCEmail = `rush-workerC-${ts}@smoketest.local`;
  let workerAToken = '';
  let workerCToken = '';
  let rushShiftId = '';

  if (!adminPassword) {
    console.log('  ⏭  Scenario E skipped — set SMOKE_ADMIN_PASSWORD to run');
  } else {
    // ── Manager B = admin account ──────────────────────────────────────────
    let managerBToken = adminToken;
    if (!managerBToken) {
      const r = await req('E.0 Admin sign-in (Manager B)', 'E', 'POST', '/api/auth/sign-in/email', {
        body: { email: 'timrwillis@gmail.com', password: adminPassword },
      });
      managerBToken = extractToken(r.data);
    }

    if (!managerBToken) {
      console.log('  ⏭  E skipped — admin sign-in failed');
    } else {
      await req('E.1 Manager B: force-complete onboarding', 'E', 'POST', '/api/admin/force-complete-onboarding', {
        token: managerBToken,
        expectedStatus: 200,
      });
      await req('E.2 Manager B: seed demo business', 'E', 'POST', '/api/admin/seed-demo-business', {
        token: managerBToken,
        expectedStatus: 200,
      });

      // ── Worker A: signup → onboarding → set template + available-now ───────
      const eA1 = await req('E.3 Worker A signup', 'E', 'POST', '/api/auth/sign-up/email', {
        body: { email: workerAEmail, password: 'TestPass123!', name: 'Rush Alice' },
        expectedStatus: [200, 201],
      });
      if (eA1.ok) {
        workerAToken = extractToken(eA1.data);
        if (!workerAToken) {
          const r2 = await req('E.3b Worker A sign-in', 'E', 'POST', '/api/auth/sign-in/email', {
            body: { email: workerAEmail, password: 'TestPass123!' },
          });
          workerAToken = extractToken(r2.data);
        }
      }

      if (workerAToken) {
        await req('E.4 Worker A: set role', 'E', 'POST', '/api/onboarding/role', {
          body: { role: 'worker' }, token: workerAToken,
        });
        await req('E.5 Worker A: worker profile', 'E', 'POST', '/api/onboarding/worker', {
          body: { name: 'Rush Alice', phone: '816-555-0901', city: 'Kansas City', bio: 'Rush test', hasTransportation: true, preferredRadiusMiles: 15 },
          token: workerAToken,
        });
        await req('E.6 Worker A: set roles (bartender)', 'E', 'POST', '/api/onboarding/worker/roles', {
          body: { roles: [{ role: 'bartender', years_experience: 3, is_primary: true }] },
          token: workerAToken,
        });
        await req('E.7 Worker A: complete onboarding', 'E', 'POST', '/api/onboarding/complete', {
          token: workerAToken,
        });

        const allDayTemplate = {
          mon: [{ start: '00:00', end: '23:59' }],
          tue: [{ start: '00:00', end: '23:59' }],
          wed: [{ start: '00:00', end: '23:59' }],
          thu: [{ start: '00:00', end: '23:59' }],
          fri: [{ start: '00:00', end: '23:59' }],
          sat: [{ start: '00:00', end: '23:59' }],
          sun: [{ start: '00:00', end: '23:59' }],
        };
        await req('E.8 Worker A: set availability template', 'E', 'PATCH', '/api/worker/availability-template', {
          body: { template: allDayTemplate }, token: workerAToken, expectedStatus: 200,
        });

        const fourHoursFromNow = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        await req('E.9 Worker A: set available-now (4h)', 'E', 'PATCH', '/api/worker/available-now', {
          body: { until: fourHoursFromNow }, token: workerAToken, expectedStatus: 200,
        });
      }

      // ── Worker C: signup → onboarding → set available-now ──────────────────
      const eC1 = await req('E.10 Worker C signup', 'E', 'POST', '/api/auth/sign-up/email', {
        body: { email: workerCEmail, password: 'TestPass123!', name: 'Rush Carlos' },
        expectedStatus: [200, 201],
      });
      if (eC1.ok) {
        workerCToken = extractToken(eC1.data);
        if (!workerCToken) {
          const r2 = await req('E.10b Worker C sign-in', 'E', 'POST', '/api/auth/sign-in/email', {
            body: { email: workerCEmail, password: 'TestPass123!' },
          });
          workerCToken = extractToken(r2.data);
        }
      }

      if (workerCToken) {
        await req('E.11 Worker C: set role', 'E', 'POST', '/api/onboarding/role', {
          body: { role: 'worker' }, token: workerCToken,
        });
        await req('E.12 Worker C: worker profile', 'E', 'POST', '/api/onboarding/worker', {
          body: { name: 'Rush Carlos', phone: '816-555-0902', city: 'Kansas City', bio: 'Rush test C', hasTransportation: true, preferredRadiusMiles: 15 },
          token: workerCToken,
        });
        await req('E.13 Worker C: set roles (bartender)', 'E', 'POST', '/api/onboarding/worker/roles', {
          body: { roles: [{ role: 'bartender', years_experience: 2, is_primary: true }] },
          token: workerCToken,
        });
        await req('E.14 Worker C: complete onboarding', 'E', 'POST', '/api/onboarding/complete', {
          token: workerCToken,
        });
        const fourHoursFromNow2 = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
        await req('E.15 Worker C: set available-now (4h)', 'E', 'PATCH', '/api/worker/available-now', {
          body: { until: fourHoursFromNow2 }, token: workerCToken, expectedStatus: 200,
        });
      }

      // ── Manager B: post rush shift (starts in 2 hours) ─────────────────────
      const twoHoursLater = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const rushDate = twoHoursLater.toISOString().slice(0, 10);
      const rushHH = String(twoHoursLater.getUTCHours()).padStart(2, '0');
      const rushMM = String(twoHoursLater.getUTCMinutes()).padStart(2, '0');
      const rushStartTime = `${rushHH}:${rushMM}`;

      const eB = await req('E.16 Manager B: post rush shift (2h from now)', 'E', 'POST', '/api/shifts', {
        body: {
          role: 'bartender',
          workers_needed: 1,
          date: rushDate,
          start_time: rushStartTime,
          end_time: '23:59',
          hourly_pay_cents: 3000,
          location: 'Rush Test Bar, Kansas City',
          urgency: 'tonight',
          is_rush: true,
          notes: 'Smoke test rush shift — safe to delete',
        },
        token: managerBToken,
        expectedStatus: 201,
      });

      if (eB.ok) {
        const ebData = eB.data as Record<string, unknown>;
        rushShiftId = ((ebData.shift as Record<string, unknown>)?.id ?? ebData.id) as string ?? '';
        const pingedCount = ebData.pinged_worker_count as number ?? 0;
        console.log(`     ℹ️  Rush shift ${rushShiftId} created, pinged_worker_count=${pingedCount}`);
      }

      // ── Worker A: see shift in rush feed → claim ───────────────────────────
      if (workerAToken && rushShiftId) {
        const eFeed = await req('E.17 Worker A: GET /api/shifts/rush-feed', 'E', 'GET', '/api/shifts/rush-feed', {
          token: workerAToken,
          expectedStatus: 200,
        });
        if (eFeed.ok) {
          const feedShifts = ((eFeed.data as Record<string, unknown>)?.shifts as unknown[]) ?? [];
          const found = (feedShifts as Array<Record<string, unknown>>).find(s => s.id === rushShiftId);
          console.log(`     ℹ️  Rush shift in feed: ${found ? 'yes ✓' : 'NOT FOUND ⚠️'} (${feedShifts.length} total)`);
        }

        await req('E.18 Worker A: claim rush shift → 200', 'E', 'POST', `/api/shifts/${rushShiftId}/claim`, {
          token: workerAToken,
          expectedStatus: 200,
        });

        await req('E.19 Worker A: claim again → 409 (already claimed)', 'E', 'POST', `/api/shifts/${rushShiftId}/claim`, {
          token: workerAToken,
          expectedStatus: 409,
        });
      } else {
        console.log('  ⏭  E.17-19 skipped — missing worker A token or rush shift ID');
      }

      // ── Worker C: claim same shift → 409 ──────────────────────────────────
      if (workerCToken && rushShiftId) {
        await req('E.20 Worker C: claim same shift → 409 (race loss)', 'E', 'POST', `/api/shifts/${rushShiftId}/claim`, {
          token: workerCToken,
          expectedStatus: 409,
        });
      } else {
        console.log('  ⏭  E.20 skipped — missing worker C token or rush shift ID');
      }
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SCENARIO F: Availability filtering — worker with no availability sees 0 shifts
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SCENARIO F  Availability filtering');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const workerDEmail = `rush-workerD-${ts}@smoketest.local`;
  let workerDToken = '';

  if (!adminPassword) {
    console.log('  ⏭  Scenario F skipped — set SMOKE_ADMIN_PASSWORD to run');
  } else {
    const fD1 = await req('F.1 Worker D signup', 'F', 'POST', '/api/auth/sign-up/email', {
      body: { email: workerDEmail, password: 'TestPass123!', name: 'No Avail Dave' },
      expectedStatus: [200, 201],
    });
    if (fD1.ok) {
      workerDToken = extractToken(fD1.data);
      if (!workerDToken) {
        const r2 = await req('F.1b Worker D sign-in', 'F', 'POST', '/api/auth/sign-in/email', {
          body: { email: workerDEmail, password: 'TestPass123!' },
        });
        workerDToken = extractToken(r2.data);
      }
    }

    if (workerDToken) {
      await req('F.2 Worker D: set role', 'F', 'POST', '/api/onboarding/role', {
        body: { role: 'worker' }, token: workerDToken,
      });
      await req('F.3 Worker D: worker profile', 'F', 'POST', '/api/onboarding/worker', {
        body: { name: 'No Avail Dave', phone: '816-555-0904', city: 'Kansas City', bio: 'No availability', hasTransportation: true, preferredRadiusMiles: 15 },
        token: workerDToken,
      });
      await req('F.4 Worker D: set roles (bartender — same as rush shift)', 'F', 'POST', '/api/onboarding/worker/roles', {
        body: { roles: [{ role: 'bartender', years_experience: 1, is_primary: true }] },
        token: workerDToken,
      });
      await req('F.5 Worker D: complete onboarding', 'F', 'POST', '/api/onboarding/complete', {
        token: workerDToken,
      });
      // Worker D intentionally does NOT set availability_template or available-now

      // Post a fresh rush shift for this scenario (Scenario E shift is already claimed)
      let adminBToken = adminToken;
      if (!adminBToken) {
        const r = await req('F.6a Admin re-auth', 'F', 'POST', '/api/auth/sign-in/email', {
          body: { email: 'timrwillis@gmail.com', password: adminPassword! },
        });
        adminBToken = extractToken(r.data);
      }

      let fRushShiftId = '';
      if (adminBToken) {
        const fRushLater = new Date(Date.now() + 3 * 60 * 60 * 1000);
        const fRushDate = fRushLater.toISOString().slice(0, 10);
        const fRushHH = String(fRushLater.getUTCHours()).padStart(2, '0');
        const fRushMM = String(fRushLater.getUTCMinutes()).padStart(2, '0');

        const fShift = await req('F.6 Admin: post fresh rush shift', 'F', 'POST', '/api/shifts', {
          body: {
            role: 'bartender',
            workers_needed: 1,
            date: fRushDate,
            start_time: `${fRushHH}:${fRushMM}`,
            end_time: '23:59',
            hourly_pay_cents: 2800,
            location: 'Filter Test Bar, Kansas City',
            urgency: 'tonight',
            is_rush: true,
            notes: 'Smoke test F — safe to delete',
          },
          token: adminBToken,
          expectedStatus: 201,
        });
        if (fShift.ok) {
          const fd = fShift.data as Record<string, unknown>;
          fRushShiftId = ((fd.shift as Record<string, unknown>)?.id ?? fd.id) as string ?? '';
        }
      }

      const fFeed = await req('F.7 Worker D: GET /api/shifts/rush-feed → expect 0 shifts', 'F', 'GET', '/api/shifts/rush-feed', {
        token: workerDToken,
        expectedStatus: 200,
      });
      if (fFeed.ok) {
        const feedShifts = ((fFeed.data as Record<string, unknown>)?.shifts as unknown[]) ?? [];
        const sawRushShift = (feedShifts as Array<Record<string, unknown>>).some(s => s.id === fRushShiftId);
        console.log(`     ℹ️  Worker D sees ${feedShifts.length} rush shift(s) — rush shift visible: ${sawRushShift ? 'YES ⚠️' : 'no ✓'}`);
        // Assert: Worker D should NOT see any rush shifts (no availability)
        if (feedShifts.length === 0) {
          console.log('  ✅ F.7 correctly returns 0 shifts for worker with no availability');
        } else if (!sawRushShift) {
          console.log('  ✅ F.7 rush shift correctly hidden (filtered by availability)');
        } else {
          console.log('  ❌ F.7 FAILED — Worker D should not see rush shifts without availability');
          const badResult: StepResult = {
            scenario: 'F',
            step: 'F.7 availability filter assertion',
            passed: false,
            status: 200,
            ms: fFeed.ms,
            error: `Worker D (no availability) saw ${feedShifts.length} shift(s) including the target rush shift`,
          };
          results.push(badResult);
          failures.push(badResult);
        }
      }
    } else {
      console.log('  ⏭  F.2-7 skipped — Worker D signup/sign-in failed');
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // CLEANUP: delete smoke test users via admin endpoint
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  CLEANUP  Delete smoke test users');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Re-auth as admin if we don't already have a token
  let cleanupToken = adminToken;
  if (!cleanupToken && adminPassword) {
    const r = await req('Cleanup: admin sign-in', 'cleanup', 'POST', '/api/auth/sign-in/email', {
      body: { email: 'timrwillis@gmail.com', password: adminPassword },
    });
    cleanupToken = extractToken(r.data);
  }

  const cleanupUsers = [
    ['worker A', workerEmail],
    ['manager', managerEmail],
    ['rush workerA', workerAEmail],
    ['rush workerC', workerCEmail],
    ['rush workerD', workerDEmail],
  ] as const;

  for (const [label, email] of cleanupUsers) {
    if (cleanupToken) {
      await req(`Cleanup: delete ${label} (${email})`, 'cleanup', 'DELETE', '/api/admin/delete-user-by-email', {
        body: { email },
        token: cleanupToken,
        expectedStatus: [200, 404],
      });
    } else {
      console.log(`  ⏭  Cleanup ${label}: skipped (SMOKE_ADMIN_PASSWORD not set — delete manually)`);
      console.log(`       email: ${email}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ════════════════════════════════════════════════════════════════════════════
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  SUMMARY');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let totalPassed = 0;
  let totalFailed = 0;

  for (const scenario of ['A', 'B', 'C', 'D', 'E', 'F'] as const) {
    const group = results.filter(r => r.scenario === scenario);
    if (group.length === 0) continue;
    const passed = group.filter(r => r.passed).length;
    const failed = group.filter(r => !r.passed).length;
    totalPassed += passed;
    totalFailed += failed;
    const avgMs = Math.round(group.reduce((sum, r) => sum + r.ms, 0) / group.length);
    console.log(`  ${failed === 0 ? '✅' : '❌'}  Scenario ${scenario}: ${passed}/${group.length} passed  (avg ${avgMs}ms)`);
  }

  console.log(`\n  Total: ${totalPassed} passed, ${totalFailed} failed`);

  if (failures.length > 0) {
    console.log('\n  Failures:');
    for (const f of failures) {
      console.log(`  ❌  [${f.scenario}] ${f.step}`);
      if (f.error) console.log(`       ${f.error}`);
    }
  }

  console.log('');
  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('\n💥  Smoke test crashed:', err);
  process.exit(1);
});
