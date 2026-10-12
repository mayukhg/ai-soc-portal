const TOKEN_KEY = "soc.postgres.token";

export interface SearchHit {
  kind: "alert" | "incident" | "indicator";
  id: string;
  title: string;
  detail: string;
}

export interface AlertCounts {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  incidents: number;
}

export interface IncidentDetail {
  incident: {
    id: string;
    title: string;
    description: string | null;
    severity: string;
    status: string;
    assignee: string | null;
    alert_count: number;
    tags: string[] | null;
    created_at: string;
    updated_at: string;
  };
  comments: {
    id: string;
    content: string;
    comment_type: string;
    created_at: string;
    profile?: { full_name?: string; role?: string; username?: string } | null;
  }[];
  alerts: {
    id: string;
    title: string;
    severity: string;
    status: string;
    source: string;
  }[];
}

function authHeaders(json = true): HeadersInit {
  const token = localStorage.getItem(TOKEN_KEY);
  return {
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    throw new Error(`Request failed (${response.status})`);
  }
  return response.json();
}

export function searchRecords(query: string) {
  return fetch("/api/search", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ query }),
  }).then((response) => readJson<{ results: SearchHit[] }>(response));
}

export function fetchAlertCounts() {
  return fetch("/api/alerts/counts", { headers: authHeaders(false) }).then((response) =>
    readJson<AlertCounts>(response)
  );
}

export function fetchIncidentDetail(incidentId: string) {
  return fetch(`/api/incidents/${incidentId}`, { headers: authHeaders(false) }).then((response) =>
    readJson<IncidentDetail>(response)
  );
}

export async function downloadCsv(path: string, filename: string) {
  const response = await fetch(path, { headers: authHeaders(false) });
  if (!response.ok) {
    throw new Error(`Export failed (${response.status})`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
