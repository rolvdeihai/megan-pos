import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const headers = {
  cookie: 'megan_pos_auth=invalid',
};

const currentResponse = await fetch(`${baseUrl}/api/auth/current`, {
  headers,
  redirect: 'manual',
});

assert.equal(currentResponse.status, 200, 'Expected /api/auth/current to return 200');

const currentData = await currentResponse.json();
assert.equal(
  currentData.user,
  null,
  'Expected invalid owner cookie to produce user=null from /api/auth/current'
);

const loginResponse = await fetch(`${baseUrl}/login`, {
  headers,
  redirect: 'manual',
});

assert.equal(
  loginResponse.status,
  200,
  `Expected /login to render for invalid owner cookie, got status ${loginResponse.status} and location "${loginResponse.headers.get('location') ?? ''}"`
);

const dashboardResponse = await fetch(`${baseUrl}/dashboard`, {
  headers,
  redirect: 'manual',
});

assert.equal(
  dashboardResponse.status,
  307,
  `Expected /dashboard to redirect for invalid owner cookie, got status ${dashboardResponse.status}`
);

const dashboardRedirect = dashboardResponse.headers.get('location') ?? '';

assert.ok(
  dashboardRedirect.includes('/login'),
  `Expected /dashboard redirect to include /login, got "${dashboardRedirect}"`
);

console.log('PASS: invalid owner cookie does not trigger /login -> /dashboard redirect loop');
