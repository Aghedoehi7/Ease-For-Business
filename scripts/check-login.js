const url = process.env.LOGIN_URL || 'http://localhost:3000/api/auth/login-db';
const email = process.env.LOGIN_EMAIL || 'demo@ease.com';
const password = process.env.LOGIN_PASSWORD || 'demo123';

async function run() {
  console.log(`Checking login route at ${url}`);
  console.log(`Using credentials: ${email} / ${password}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  console.log('HTTP status:', response.status);

  let data;
  try {
    data = await response.json();
  } catch (err) {
    console.error('Failed to parse JSON response:', err);
    process.exit(1);
  }

  console.log('Response body:', JSON.stringify(data, null, 2));

  if (response.ok && data.token) {
    console.log('\n✅ Login route appears healthy: token returned.');
    process.exit(0);
  }

  console.error('\n❌ Login route check failed.');
  if (!response.ok && data.error) {
    console.error('Error from API:', data.error);
  }
  process.exit(1);
}

run().catch((err) => {
  console.error('Login route check exception:', err);
  process.exit(1);
});
