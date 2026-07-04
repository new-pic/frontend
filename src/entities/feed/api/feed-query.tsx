import { ApiInstance } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import { API_QUERY_KEY } from "../model";

const QUERY_KEY = [API_QUERY_KEY, "feed"];

export function useReadFeeds() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await ApiInstance.get("/feed");
      return response.data;
    },
  });
}
