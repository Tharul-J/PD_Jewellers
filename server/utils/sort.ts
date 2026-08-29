// Newest-first ordering for the in-memory mock payloads served when there is no
// database connection. Real queries get this from Mongo via .sort({ createdAt: -1 });
// these fixtures need the same guarantee so list order doesn't change between
// the mock fallback and a live database.
export const newestFirst = <T extends { createdAt?: string | Date }>(list: T[]): T[] =>
  [...list].sort(
    (a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime()
  );
