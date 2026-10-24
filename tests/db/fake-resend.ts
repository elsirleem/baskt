import { vi } from "vitest";

/** Intercepts calls to Resend; returns the request bodies that were "sent". */
export function fakeResend(
  response: { status: number; body: object } = { status: 200, body: { id: "email_123" } },
) {
  process.env.RESEND_API_KEY = "re_test_only_key";
  const fetchSpy = vi
    .spyOn(globalThis, "fetch")
    .mockImplementation(async () => new Response(JSON.stringify(response.body), { status: response.status }));
  const sent = () =>
    fetchSpy.mock.calls.map(([, init]) => ({
      headers: init?.headers as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    }));
  return { fetchSpy, sent };
}
