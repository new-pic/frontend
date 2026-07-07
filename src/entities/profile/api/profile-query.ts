import { ApiPrivateInstance } from "@shared/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { API_QUERY_KEY, UpdateProfileRequest } from "../model";

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

export function useFetchMe() {
  const queryClient = useQueryClient();
  const fetchMe = async () => {
    return await queryClient.fetchQuery({
      queryKey: [...QUERY_KEY, "me"],
      queryFn: async () => {
        const response = await ApiPrivateInstance.get("/users/me");
        return response.data;
      },
      staleTime: 1000 * 60 * 5,
    });
  };

  return fetchMe;
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: [...QUERY_KEY, "update"],
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await ApiPrivateInstance.patch("/users/me", data);
      queryClient.invalidateQueries({ queryKey: [...QUERY_KEY, "me"] });
      return response.data;
    },
  });
}
