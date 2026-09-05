// Pure helper: integration tests can still supply their own PostgreSQL client.
export const D1_CLIENT = Symbol.for("ow-activity.d1-client");

export function isD1Database() {
  return process.env.DATABASE_PROVIDER === "d1";
}

export function usesD1(client: object) {
  return Boolean(Reflect.get(client, D1_CLIENT));
}
