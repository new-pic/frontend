import { createApiClient } from "./api-client";
import { setupInterceptors } from "./interceptors";

export const privateApiClient = createApiClient();

setupInterceptors({ instance: privateApiClient });
