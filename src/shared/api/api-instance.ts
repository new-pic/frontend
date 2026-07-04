import axios from "axios";
import { env } from "../config";

export const ApiInstance = axios.create({
  baseURL: env.API_URL,
  timeout: 10000,
});
