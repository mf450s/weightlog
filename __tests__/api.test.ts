import AsyncStorage from "@react-native-async-storage/async-storage";

// Must be imported AFTER mocks are set up
import * as api from "../lib/api";
import type { AuthToken, ExerciseRead } from "../lib/types";

// ── Helpers ─────────────────────────────────────

const mockToken: AuthToken = {
  access_token: "acc_xyz",
  refresh_token: "ref_xyz",
  token_type: "bearer",
  user: { id: 1, name: "Test", email: "t@t.com", created_at: "2025-01-01" },
};

// We use a const assertion so TS doesn't narrow to 'never'
const fetchMock: jest.Mock = jest.fn();

beforeEach(() => {
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof global.fetch;
  delete process.env.EXPO_PUBLIC_API_URL;
  api.clearAuth();
  return AsyncStorage.clear();
});

function mockFetchResponse(data: unknown, status = 200, statusText = "OK") {
  fetchMock.mockResolvedValueOnce(
    new Response(JSON.stringify(data), { status, statusText }),
  );
}

function mockFetchSequence(
  ...responses: { data: unknown; status?: number }[]
) {
  responses.forEach((r) =>
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify(r.data), { status: r.status ?? 200 }),
    ),
  );
}

function lastFetchUrl(): string {
  const [url] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return (url as string) ?? "";
}

function lastFetchOpts(): RequestInit {
  const [, opts] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
  return (opts ?? {}) as RequestInit;
}

// ── Base URL ────────────────────────────────────

describe("getApiBase / setApiBase", () => {
  it("falls back to localhost when nothing is set", async () => {
    jest.resetModules();
    const mod = await import("../lib/api");
    const base = await mod.getApiBase();
    expect(base).toBe("http://localhost:8000");
  });

  it("uses EXPO_PUBLIC_API_URL when env is set", async () => {
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com";
    jest.resetModules();
    const mod = await import("../lib/api");
    const base = await mod.getApiBase();
    expect(base).toBe("https://api.example.com");
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  it("persists custom URL in AsyncStorage", async () => {
    await api.setApiBase("https://my-server.com");
    const stored = await AsyncStorage.getItem(api.API_URL_STORAGE_KEY);
    expect(stored).toBe("https://my-server.com");
    const base = await api.getApiBase();
    expect(base).toBe("https://my-server.com");
  });
});

// ── Auth state ──────────────────────────────────

describe("auth state management", () => {
  it("loadAuth returns null when nothing stored", async () => {
    const t = await api.loadAuth();
    expect(t).toBeNull();
  });

  it("loadAuth reads stored token", async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    const t = await api.loadAuth();
    expect(t).toEqual(mockToken);
  });

  it("getAccessToken returns null before login", () => {
    expect(api.getAccessToken()).toBeNull();
  });

  it("getCurrentUser returns null before login", () => {
    expect(api.getCurrentUser()).toBeNull();
  });

  it("clearAuth resets state", async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
    expect(api.getAccessToken()).toBe("acc_xyz");
    await api.clearAuth();
    expect(api.getAccessToken()).toBeNull();
    expect(api.getCurrentUser()).toBeNull();
  });
});

// ── Core request() ──────────────────────────────

describe("request (core HTTP layer)", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
  });

  it("sends GET request with auth header", async () => {
    mockFetchResponse({ id: 1 });
    const me = await api.getMe();
    expect(me).toEqual({ id: 1 });

    const url = lastFetchUrl();
    const opts = lastFetchOpts();
    expect(url).toMatch(/\/api\/v1\/users\/me$/);
    const h = opts.headers as Record<string, string>;
    expect(h["Authorization"]).toBe("Bearer acc_xyz");
  });

  it("throws structured error on non-OK response", async () => {
    mockFetchResponse({ detail: "Not found" }, 404);
    await expect(api.getExercise(99)).rejects.toThrow("404: Not found");
  });

  it("handles non-JSON error response gracefully", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response("Internal Error", { status: 500, statusText: "Server Error" }),
    );
    await expect(api.getMe()).rejects.toThrow("500: Server Error");
  });

  it("skips auth header when auth=false", async () => {
    mockFetchResponse(mockToken);
    await api.register({ name: "u", email: "e@e.com", password: "p" });
    const h = lastFetchOpts().headers as Record<string, string>;
    expect(h["Authorization"]).toBeUndefined();
  });

  it("returns undefined for 204 responses", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    const result = await api.deleteSession(1);
    expect(result).toBeUndefined();
  });
});

// ── Auth endpoints ──────────────────────────────

describe("login / register / logout", () => {
  beforeEach(async () => {
    await api.clearAuth();
  });

  it("login saves token and returns it", async () => {
    mockFetchResponse(mockToken);
    const t = await api.login({ email: "t@t.com", password: "sekret" });
    expect(t).toEqual(mockToken);
    expect(api.getAccessToken()).toBe("acc_xyz");
  });

  it("register does not save auth", async () => {
    mockFetchResponse(mockToken.user);
    const u = await api.register({ name: "T", email: "t@t.com", password: "p" });
    expect(u.name).toBe("Test");
    expect(api.getAccessToken()).toBeNull();
  });

  it("logout clears auth", async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
    mockFetchResponse({});
    await api.logout();
    expect(api.getAccessToken()).toBeNull();
  });
});

// ── Token refresh on 401 ────────────────────────

describe("token refresh on 401", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
  });

  it("retries with refreshed token on 401", async () => {
    const refreshedToken = { ...mockToken, access_token: "acc_refreshed" };

    mockFetchSequence(
      { data: { detail: "Token expired" }, status: 401 },
      { data: refreshedToken },
      { data: { id: 1, name: "T", email: "t@t.com", created_at: "2025-01-01" } },
    );

    const me = await api.getMe();
    expect(me.name).toBe("T");
    expect(api.getAccessToken()).toBe("acc_refreshed");
  });

  it("clears auth and throws when refresh also fails", async () => {
    mockFetchSequence(
      { data: { detail: "Token expired" }, status: 401 },
      { data: { detail: "Invalid refresh" }, status: 401 },
    );

    await expect(api.getMe()).rejects.toThrow();
    expect(api.getAccessToken()).toBeNull();
  });
});

// ── Exercise endpoints ──────────────────────────

describe("exercise endpoints", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
  });

  it("listExercises", async () => {
    const exercises: ExerciseRead[] = [{
      id: 1, name: "Bench Press", muscle_region_id: 1, laterality: "bilateral",
      created_by_user_id: null, is_public: true, execution_notes: null,
    }];
    mockFetchResponse(exercises);
    const result = await api.listExercises();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Bench Press");
  });

  it("createExercise sends POST with correct body", async () => {
    mockFetchResponse({
      id: 2, name: "Squat", muscle_region_id: 2, laterality: "bilateral",
      created_by_user_id: 1, is_public: true, execution_notes: null,
    });
    const result = await api.createExercise({ name: "Squat", muscle_region_id: 2 });
    expect(result.name).toBe("Squat");

    const opts = lastFetchOpts();
    expect(opts.method).toBe("POST");
    const body = JSON.parse(opts.body as string);
    expect(body.name).toBe("Squat");
  });

  it("getExerciseHistory and getExercise1rm", async () => {
    mockFetchResponse([{ session_id: 1, performed_at: "2025-01-01", sets: [] }]);
    mockFetchResponse([{ performed_at: "2025-01-01", estimated_1rm: 100 }]);

    const history = await api.getExerciseHistory(1);
    expect(history).toHaveLength(1);

    const rm = await api.getExercise1rm(1);
    expect(rm[0].estimated_1rm).toBe(100);
  });
});

// ── Session endpoints ───────────────────────────

describe("session endpoints", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
  });

  it("createSession sends correct payload", async () => {
    mockFetchResponse({
      id: 1, user_id: 1, template_id: null, performed_at: "2025-01-01",
      notes: null, started_at: null, ended_at: null, active_session: true,
    });
    const session = await api.createSession({ performed_at: "2025-01-01" });
    expect(session.id).toBe(1);
    expect(session.active_session).toBe(true);
    expect(lastFetchOpts().method).toBe("POST");
  });

  it("deleteSession sends DELETE", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await api.deleteSession(5);
    expect(lastFetchUrl()).toMatch(/\/sessions\/5$/);
    expect(lastFetchOpts().method).toBe("DELETE");
  });
});

// ── Muscle endpoints ────────────────────────────

describe("muscle endpoints", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
  });

  it("listMuscleGroups", async () => {
    mockFetchResponse([{ id: 1, name: "Chest" }]);
    const groups = await api.listMuscleGroups();
    expect(groups[0].name).toBe("Chest");
  });

  it("listMuscleRegions with group filter appends query param", async () => {
    mockFetchResponse([]);
    await api.listMuscleRegions(3);
    expect(lastFetchUrl()).toContain("?group_id=3");
  });
});

// ── Templates ───────────────────────────────────

describe("template endpoints", () => {
  beforeEach(async () => {
    await AsyncStorage.setItem("openweights_auth", JSON.stringify(mockToken));
    await api.loadAuth();
  });

  it("listTemplates returns parsed data", async () => {
    mockFetchResponse([
      { id: 1, name: "Push Day", split_id: null, order_in_split: null },
    ]);
    const templates = await api.listTemplates();
    expect(templates).toHaveLength(1);
    expect(templates[0].name).toBe("Push Day");
  });
});
