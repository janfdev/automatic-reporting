jest.mock("@/lib/auth", () => ({
  auth: { handler: jest.fn() },
}));

const mockHandlers = {
  GET: jest.fn(),
  POST: jest.fn(),
};

jest.mock("better-auth/next-js", () => ({
  toNextJsHandler: jest.fn(() => mockHandlers),
}));

import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/lib/auth";
import { GET, POST } from "@/app/api/auth/[...all]/route";

describe("Better Auth route", () => {
  it("mengekspor handler GET dan POST dari konfigurasi auth aplikasi", () => {
    expect(toNextJsHandler).toHaveBeenCalledWith(auth);
    expect(GET).toBe(mockHandlers.GET);
    expect(POST).toBe(mockHandlers.POST);
  });
});
