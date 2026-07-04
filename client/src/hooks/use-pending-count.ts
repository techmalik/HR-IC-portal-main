import { useQuery } from "@tanstack/react-query";

export function usePendingCount(endpoint: string, enabled: boolean): number {
  const { data } = useQuery<number>({
    queryKey: [endpoint],
    queryFn: async () => {
      const res = await fetch(endpoint, { credentials: "include" });
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled,
  });
  return data || 0;
}
