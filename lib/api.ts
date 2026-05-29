import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type {
  AuthToken,
  LoginRequest,
  RegisterRequest,
  UserRead,
  UserUpdate,
  UserPasswordUpdate,
  UserSettings,
  ExerciseRead,
  ExerciseCreate,
  ExerciseUpdate,
  MuscleGroup,
  MuscleRegion,
  ExerciseSessionHistory,
  Estimated1RmPoint,
  WorkoutTemplate,
  TemplateExercise,
  TrainingSplit,
  WorkoutSession,
  SessionSet,
} from "./types";

const STORAGE_KEY = "openweights_auth";
const URL_STORAGE_KEY = "openweights_api_url";

const DEFAULT_BASE = Platform.select({
  android: "http://10.0.2.2:8000",
  ios: "http://localhost:8000",
  default: "http://localhost:8000",
});

let _base: string | null = null;

export async function getApiBase(): Promise<string> {
  if (_base) return _base;
  try {
    const stored = await AsyncStorage.getItem(URL_STORAGE_KEY);
    if (stored) {
      _base = stored;
      return stored;
    }
  } catch {}
  _base = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE;
  return _base;
}

export async function setApiBase(url: string): Promise<void> {
  _base = url;
  await AsyncStorage.setItem(URL_STORAGE_KEY, url);
}

async function apiUrl(): Promise<string> {
  const base = await getApiBase();
  return `${base}/api/v1`;
}

export { URL_STORAGE_KEY as API_URL_STORAGE_KEY };

// ── Auth State ───────────────────────────────────

let _tokens: AuthToken | null = null;

export async function loadAuth(): Promise<AuthToken | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (raw) _tokens = JSON.parse(raw);
  return _tokens;
}

async function saveAuth(t: AuthToken) {
  _tokens = t;
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(t));
}

export async function clearAuth() {
  _tokens = null;
  await AsyncStorage.removeItem(STORAGE_KEY);
}

export function getAccessToken(): string | null {
  return _tokens?.access_token ?? null;
}

export function getCurrentUser(): UserRead | null {
  return _tokens?.user ?? null;
}

// ── HTTP Helpers ─────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (auth && _tokens) {
    headers["Authorization"] = `Bearer ${_tokens.access_token}`;
  }

  // Try token refresh on 401
  const base = await apiUrl();
  let res = await fetch(`${base}${path}`, { ...options, headers });
  if (res.status === 401 && auth && _tokens?.refresh_token) {
    const refreshed = await rawRefresh();
    if (refreshed) {
      headers["Authorization"] = `Bearer ${_tokens!.access_token}`;
      res = await fetch(`${base}${path}`, { ...options, headers });
    }
  }
  if (!res.ok) {
    let detail: string;
    try {
      detail = (await res.json()).detail ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

async function rawRefresh(): Promise<boolean> {
  if (!_tokens?.refresh_token) return false;
  try {
    const res = await fetch(`${await apiUrl()}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: _tokens.refresh_token }),
    });
    if (!res.ok) {
      await clearAuth();
      return false;
    }
    const t: AuthToken = await res.json();
    await saveAuth(t);
    return true;
  } catch {
    return false;
  }
}

// ── Auth ─────────────────────────────────────────

export async function login(data: LoginRequest): Promise<AuthToken> {
  const t = await request<AuthToken>("/auth/login", {
    method: "POST",
    body: JSON.stringify(data),
  }, false);
  await saveAuth(t);
  return t;
}

export async function register(data: RegisterRequest): Promise<UserRead> {
  return request<UserRead>("/auth/register", {
    method: "POST",
    body: JSON.stringify(data),
  }, false);
}

export async function logout(): Promise<void> {
  if (_tokens?.refresh_token) {
    try {
      await request("/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: _tokens.refresh_token }),
      });
    } catch {}
  }
  await clearAuth();
}

// ── Users ────────────────────────────────────────

export async function getMe(): Promise<UserRead> {
  return request<UserRead>("/users/me");
}

export async function updateMe(data: UserUpdate): Promise<UserRead> {
  return request<UserRead>("/users/me", { method: "PATCH", body: JSON.stringify(data) });
}

export async function updatePassword(data: UserPasswordUpdate): Promise<void> {
  return request("/users/me/password", { method: "POST", body: JSON.stringify(data) });
}

export async function deleteAccount(password: string): Promise<void> {
  return request("/users/me", { method: "DELETE", body: JSON.stringify({ password }) });
}

export async function getSettings(): Promise<UserSettings> {
  return request<UserSettings>("/users/me/settings");
}

export async function updateSettings(preferences: Record<string, unknown>): Promise<UserSettings> {
  return request<UserSettings>("/users/me/settings", {
    method: "PUT",
    body: JSON.stringify({ preferences }),
  });
}

export async function patchSettings(preferences: Record<string, unknown>): Promise<UserSettings> {
  return request<UserSettings>("/users/me/settings", {
    method: "PATCH",
    body: JSON.stringify({ preferences }),
  });
}

// ── Exercises ────────────────────────────────────

export async function listExercises(): Promise<ExerciseRead[]> {
  return request<ExerciseRead[]>("/exercises/");
}

export async function getExercise(id: number): Promise<ExerciseRead> {
  return request<ExerciseRead>(`/exercises/${id}`);
}

export async function createExercise(data: ExerciseCreate): Promise<ExerciseRead> {
  return request<ExerciseRead>("/exercises/", { method: "POST", body: JSON.stringify(data) });
}

export async function updateExercise(id: number, data: ExerciseUpdate): Promise<ExerciseRead> {
  return request<ExerciseRead>(`/exercises/${id}`, { method: "PATCH", body: JSON.stringify(data) });
}

export async function deleteExercise(id: number): Promise<void> {
  return request(`/exercises/${id}`, { method: "DELETE" });
}

export async function getExerciseHistory(id: number): Promise<ExerciseSessionHistory[]> {
  return request<ExerciseSessionHistory[]>(`/exercises/${id}/history`);
}

export async function getExercise1rm(id: number): Promise<Estimated1RmPoint[]> {
  return request<Estimated1RmPoint[]>(`/exercises/${id}/1rm`);
}

export async function listMuscleGroups(): Promise<MuscleGroup[]> {
  return request<MuscleGroup[]>("/exercises/muscle-groups/");
}

export async function listMuscleRegions(groupId?: number): Promise<MuscleRegion[]> {
  const qs = groupId ? `?group_id=${groupId}` : "";
  return request<MuscleRegion[]>(`/exercises/muscle-regions/${qs}`);
}

// ── Templates ────────────────────────────────────

export async function listTemplates(): Promise<WorkoutTemplate[]> {
  return request<WorkoutTemplate[]>("/templates/");
}

export async function getTemplate(id: number): Promise<WorkoutTemplate> {
  return request<WorkoutTemplate>(`/templates/${id}`);
}

export async function createTemplate(name: string, splitId?: number): Promise<WorkoutTemplate> {
  return request<WorkoutTemplate>("/templates/", {
    method: "POST",
    body: JSON.stringify({ name, split_id: splitId ?? null }),
  });
}

export async function deleteTemplate(id: number): Promise<void> {
  return request(`/templates/${id}`, { method: "DELETE" });
}

export async function listTemplateExercises(templateId: number): Promise<TemplateExercise[]> {
  return request<TemplateExercise[]>(`/templates/${templateId}/exercises`);
}

export async function addTemplateExercise(
  templateId: number,
  data: { exercise_id: number; sets?: number; reps?: number; rir?: number },
): Promise<TemplateExercise> {
  return request<TemplateExercise>(`/templates/${templateId}/exercises`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateTemplateExercise(
  templateId: number,
  exerciseId: number,
  data: Record<string, unknown>,
): Promise<TemplateExercise> {
  return request<TemplateExercise>(`/templates/${templateId}/exercises/${exerciseId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function removeTemplateExercise(templateId: number, exerciseId: number): Promise<void> {
  return request(`/templates/${templateId}/exercises/${exerciseId}`, { method: "DELETE" });
}

// ── Splits ───────────────────────────────────────

export async function listSplits(): Promise<TrainingSplit[]> {
  return request<TrainingSplit[]>("/splits/");
}

export async function createSplit(name: string, description?: string): Promise<TrainingSplit> {
  return request<TrainingSplit>("/splits/", {
    method: "POST",
    body: JSON.stringify({ name, description: description ?? null }),
  });
}

export async function getSplit(id: number): Promise<TrainingSplit> {
  return request<TrainingSplit>(`/splits/${id}`);
}

export async function deleteSplit(id: number): Promise<void> {
  return request(`/splits/${id}`, { method: "DELETE" });
}

export async function addTemplateToSplit(splitId: number, templateId: number): Promise<void> {
  return request(`/splits/${splitId}/templates/${templateId}`, { method: "POST" });
}

// ── Sessions ─────────────────────────────────────

export async function listSessions(limit = 50): Promise<WorkoutSession[]> {
  return request<WorkoutSession[]>(`/sessions/?limit=${limit}`);
}

export async function getSession(id: number): Promise<WorkoutSession> {
  return request<WorkoutSession>(`/sessions/${id}`);
}

export async function createSession(data: {
  template_id?: number;
  performed_at: string;
  notes?: string;
}): Promise<WorkoutSession> {
  return request<WorkoutSession>("/sessions/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSession(
  id: number,
  data: Record<string, unknown>,
): Promise<WorkoutSession> {
  return request<WorkoutSession>(`/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSession(id: number): Promise<void> {
  return request(`/sessions/${id}`, { method: "DELETE" });
}

export async function listSessionSets(sessionId: number): Promise<SessionSet[]> {
  return request<SessionSet[]>(`/sessions/${sessionId}/sets`);
}

export async function createSessionSet(
  sessionId: number,
  data: {
    exercise_id?: number;
    template_exercise_id?: number;
    set_number: number;
    weight_kg?: number;
    reps?: number;
    rir?: number;
    side?: string;
  },
): Promise<SessionSet> {
  return request<SessionSet>(`/sessions/${sessionId}/sets`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateSessionSet(
  sessionId: number,
  setId: number,
  data: Record<string, unknown>,
): Promise<SessionSet> {
  return request<SessionSet>(`/sessions/${sessionId}/sets/${setId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteSessionSet(sessionId: number, setId: number): Promise<void> {
  return request(`/sessions/${sessionId}/sets/${setId}`, { method: "DELETE" });
}
