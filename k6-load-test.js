// k6-load-test.js
import http from "k6/http";
import { check, group, sleep } from "k6";
import { Trend, Rate, Counter } from "k6/metrics";

// =============================================
// CUSTOM METRICS
// =============================================
const loginDuration = new Trend("login_duration", true);
const reportDuration = new Trend("report_duration", true);
const loginFailRate = new Rate("login_fail_rate");
const reportFailRate = new Rate("report_fail_rate");
const reportSubmitted = new Counter("reports_submitted");

// =============================================
// KONFIGURASI - sesuaikan BASE_URL dan kredensial
// =============================================
const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = __ENV.TEST_EMAIL || "kasir_test@example.com";
const TEST_PASS = __ENV.TEST_PASS || "Password123!";
const LOGIN_VUS = Number(__ENV.LOGIN_VUS || 20);
const INPUT_VUS = Number(__ENV.INPUT_VUS || 50);
const RAMP_UP = __ENV.RAMP_UP || "1m";
const HOLD = __ENV.HOLD || "3m";
const RAMP_DOWN = __ENV.RAMP_DOWN || "30s";

// =============================================
// SKENARIO LOAD TEST
// Hanya menguji login dan input data.
// Untuk simulasi 200 user input bersamaan:
// BASE_URL=https://domain-anda TEST_EMAIL=... TEST_PASS=... INPUT_VUS=200 k6 run k6-load-test.js
// =============================================
export const options = {
  scenarios: {
    login_flow: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: RAMP_UP, target: LOGIN_VUS },
        { duration: HOLD, target: LOGIN_VUS },
        { duration: RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: "10s",
      tags: { scenario: "login" },
    },
    input_data_flow: {
      executor: "ramping-vus",
      exec: "inputDataScenario",
      startVUs: 0,
      stages: [
        { duration: RAMP_UP, target: INPUT_VUS },
        { duration: HOLD, target: INPUT_VUS },
        { duration: RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: "10s",
      tags: { scenario: "input_data" },
    },
  },
  thresholds: {
    // 95% request harus selesai < 3 detik
    http_req_duration: ["p(95)<3000"],
    // Error rate < 5%
    http_req_failed: ["rate<0.05"],
    // Custom: login < 2 detik
    login_duration: ["p(95)<2000"],
    // Custom: submit report < 3 detik
    report_duration: ["p(95)<3000"],
    // Login fail < 5%
    login_fail_rate: ["rate<0.05"],
  },
};

// =============================================
// HELPER: Login dan return session cookie
// =============================================
function doLogin() {
  const payload = JSON.stringify({ email: TEST_EMAIL, password: TEST_PASS });
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/auth/sign-in/email`, payload, {
    headers,
    tags: { name: "login" },
  });
  loginDuration.add(Date.now() - start);

  const success = check(res, {
    "login: status 200": (r) => r.status === 200,
    "login: response ok": (r) => {
      try {
        const body = JSON.parse(r.body);
        return (
          body.user !== undefined ||
          body.token !== undefined ||
          body.session !== undefined
        );
      } catch {
        return false;
      }
    },
    "login: set-cookie header": (r) =>
      r.headers["Set-Cookie"] !== undefined ||
      r.cookies["prtl.session_token"] !== undefined ||
      r.cookies["__Secure-prtl.session_token"] !== undefined,
  });

  loginFailRate.add(!success);
  return success ? res : null;
}

// =============================================
// HELPER: Submit laporan harian
// =============================================
function doSubmitReport(cookies) {
  const payload = JSON.stringify({
    salesGroceries: Math.floor(Math.random() * 2_000_000) + 500_000,
    salesLpg: Math.floor(Math.random() * 500_000),
    salesPelumas: Math.floor(Math.random() * 200_000),
    fulfillmentPb: Math.floor(Math.random() * 30) + 70, // 70-100%
    avgFulfillmentDc: Math.floor(Math.random() * 20) + 80,
    itemOos: [],
    stockLpg3kg: Math.floor(Math.random() * 20),
    stockLpg5kg: Math.floor(Math.random() * 10),
    stockLpg12kg: Math.floor(Math.random() * 5),
    waste: Math.floor(Math.random() * 100_000),
    losses: Math.floor(Math.random() * 50_000),
    isStoreHealthy: "store sehat",
    needSupport: "", // akan dinormalisasi jadi "Aman"
    formKendala: "", // akan dinormalisasi jadi "Tidak ada"
  });

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    Cookie: cookies,
  };

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/reports`, payload, {
    headers,
    tags: { name: "submit_report" },
  });
  reportDuration.add(Date.now() - start);

  const success = check(res, {
    "report: status 200": (r) => r.status === 200,
    "report: success true": (r) => {
      try {
        return JSON.parse(r.body)?.success === true;
      } catch {
        return false;
      }
    },
  });

  reportFailRate.add(!success);
  if (success) reportSubmitted.add(1);
  return success;
}

// =============================================
// DEFAULT EXPORT: Skenario Login
// =============================================
export default function loginScenario() {
  group("Skenario Login", () => {
    const res = doLogin();
    if (!res) {
      sleep(2);
      return;
    }
    sleep(1);
  });
}

// =============================================
// NAMED EXPORT: Skenario Input Data
// (dipanggil oleh scenario input_data_flow)
// =============================================
export function inputDataScenario() {
  group("Skenario Input Data", () => {
    // Step 1: Login dulu
    const loginRes = doLogin();
    if (!loginRes) {
      sleep(2);
      return;
    }

    // Ambil cookie dari response login
    let sessionCookie = "";
    const cookies = loginRes.cookies;
    const cookieParts = [];
    for (const [name, values] of Object.entries(cookies)) {
      if (Array.isArray(values) && values[0]?.value) {
        cookieParts.push(`${name}=${values[0].value}`);
      }
    }
    sessionCookie = cookieParts.join("; ");

    sleep(0.5); // jeda singkat antar request (simulasi UX)

    // Step 2: Submit laporan
    doSubmitReport(sessionCookie);

    sleep(1);
  });
}
