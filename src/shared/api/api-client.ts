import axios from "axios";
import { env } from "../config";

export const createApiClient = () =>
  axios.create({
    baseURL: env.API_URL,
    timeout: 10000,
  });

export const apiClient = createApiClient();
