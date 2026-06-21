// k6-smoke-test.js
import http from "k6/http";
import { check } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://localhost:3000";

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_duration: ["p(100)<5000"],
    http_req_failed:   ["rate==0"],
  },
};

export default function () {
  // 1. Cek halaman login tersedia
  const loginPage = http.get(`${BASE_URL}/login`);
  check(loginPage, {
    "login page: status 200": (r) => r.status === 200,
  });

  // 2. Cek endpoint auth tersedia
  const authCheck = http.post(
    `${BASE_URL}/api/auth/sign-in/email`,
    JSON.stringify({ email: "test@test.com", password: "wrong" }),
    { headers: { "Content-Type": "application/json" } }
  );
  check(authCheck, {
    "auth endpoint: reachable (not 404/500)": (r) => r.status !== 404 && r.status !== 500,
  });
}
