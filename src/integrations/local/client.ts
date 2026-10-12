/**
 * Browser client for the local PostgreSQL API.
 * Matches the subset of supabase-js that the dashboard hooks call.
 */

const TOKEN_KEY = "soc.postgres.token";

type Listener = (event: string, session: Session | null) => void;

interface SessionUser {
  id: string;
  email: string;
  aud?: string;
  role?: string;
  created_at?: string;
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

interface Session {
  access_token: string;
  token_type?: string;
  expires_at?: number;
  user: SessionUser;
}

const listeners = new Set<Listener>();

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function notify(event: string, session: Session | null) {
  listeners.forEach((listener) => listener(event, session));
}

async function readSession(): Promise<Session | null> {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;
  const response = await fetch("/api/auth/session", { headers: authHeaders() });
  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEY);
    return null;
  }
  const body = await response.json();
  return body.session ?? null;
}

class QueryBuilder implements PromiseLike<{ data: unknown; error: { message: string; code?: string } | null }> {
  private action = "select";
  private payload: unknown = null;
  private filters: { op: string; column: string; value: unknown }[] = [];
  private orderBy: { column: string; ascending: boolean } | null = null;
  private limitN: number | null = null;
  private asSingle = false;
  private selectClause = "*";

  constructor(private table: string) {}

  select(columns = "*") {
    this.action = "select";
    this.selectClause = columns;
    return this;
  }

  insert(rows: unknown) {
    this.action = "insert";
    this.payload = rows;
    return this;
  }

  update(values: unknown) {
    this.action = "update";
    this.payload = values;
    return this;
  }

  delete() {
    this.action = "delete";
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ op: "eq", column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ op: "gte", column, value });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }) {
    this.orderBy = { column, ascending: options?.ascending !== false };
    return this;
  }

  limit(count: number) {
    this.limitN = count;
    return this;
  }

  single() {
    this.asSingle = true;
    return this;
  }

  then<TResult1 = { data: unknown; error: { message: string; code?: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: { message: string; code?: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return this.execute().then(onfulfilled, onrejected);
  }

  private async execute() {
    try {
      const response = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          table: this.table,
          action: this.action,
          payload: this.payload,
          filters: this.filters,
          order: this.orderBy,
          limit: this.limitN,
          single: this.asSingle,
          select: this.selectClause,
        }),
      });
      const body = await response.json();
      if (!response.ok && body?.error) {
        return { data: null, error: body.error.message ? body.error : { message: body.error } };
      }
      return body;
    } catch (error) {
      return {
        data: null,
        error: { message: error instanceof Error ? error.message : "Backend unavailable" },
      };
    }
  }
}

export function createLocalClient() {
  return {
    auth: {
      onAuthStateChange(callback: Listener) {
        listeners.add(callback);
        readSession().then((session) => callback("INITIAL_SESSION", session));
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(callback);
              },
            },
          },
        };
      },
      async getSession() {
        const session = await readSession();
        return { data: { session }, error: null };
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const response = await fetch("/api/auth/signin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        const body = await response.json();
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: body.error || "Invalid login credentials" } };
        }
        localStorage.setItem(TOKEN_KEY, body.session.access_token);
        notify("SIGNED_IN", body.session);
        return { data: { user: body.user, session: body.session }, error: null };
      },
      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: { full_name?: string; username?: string } };
      }) {
        const response = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            full_name: options?.data?.full_name,
            username: options?.data?.username,
          }),
        });
        const body = await response.json();
        if (!response.ok) {
          return { data: { user: null, session: null }, error: { message: body.error || "Sign up failed" } };
        }
        localStorage.setItem(TOKEN_KEY, body.session.access_token);
        notify("SIGNED_IN", body.session);
        return { data: { user: body.user, session: body.session }, error: null };
      },
      async signOut() {
        await fetch("/api/auth/signout", { method: "POST", headers: authHeaders() });
        localStorage.removeItem(TOKEN_KEY);
        notify("SIGNED_OUT", null);
        return { error: null };
      },
    },
    from(table: string) {
      return new QueryBuilder(table);
    },
    functions: {
      async invoke(name: string, options?: { body?: unknown }) {
        try {
          const response = await fetch(`/api/functions/${name}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify(options?.body ?? {}),
          });
          const data = await response.json();
          if (!response.ok) {
            return { data: null, error: { message: data.error || response.statusText } };
          }
          return { data, error: null };
        } catch (error) {
          return {
            data: null,
            error: { message: error instanceof Error ? error.message : "Backend unavailable" },
          };
        }
      },
    },
  };
}
