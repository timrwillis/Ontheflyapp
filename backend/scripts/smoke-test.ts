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

  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
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
        hourly_pay: '25.00',
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

  for (const [label, email] of [['worker', workerEmail], ['manager', managerEmail]] as const) {
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

  for (const scenario of ['A', 'B', 'C', 'D'] as const) {
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
