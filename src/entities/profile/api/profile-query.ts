import { ApiPrivateInstance } from "@shared/api";
import { useQuery } from "@tanstack/react-query";
import { API_QUERY_KEY } from "../model";

const QUERY_KEY = [API_QUERY_KEY, "profile"];

export function useReadMe() {
  return useQuery({
    queryKey: [...QUERY_KEY, "me"],
    queryFn: async () => {
      const response = await ApiPrivateInstance.get("/users/me");
      return response.data;
    },
  });
}
