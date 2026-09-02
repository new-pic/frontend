import fsd from "@feature-sliced/steiger-plugin";
import { defineConfig } from "steiger";

export default defineConfig([
  ...fsd.configs.recommended,
  {
    rules: {
      "fsd/insignificant-slice": "warn",
    },
  },
  {
    files: [
      "./src/entities/tag/**",
      "./src/entities/rtc-room/**",
      "./src/entities/rtc-session/**",
      "./src/features/camera/capture-photo/**",
      "./src/features/feed/create-feed-comment/**",
      "./src/features/feed/delete-feed/**",
      "./src/features/feed/report-content/**",
      "./src/features/feed/update-feed-like/**",
      "./src/features/feed/update-feed-pick/**",
      "./src/features/profile/save-user-setup/**",
      "./src/features/photo/save-images-to-library/**",
      "./src/features/rtc-photo/browse-stored-photos/**",
      "./src/features/rtc-photo/save-stored-photo/**",
      "./src/features/rtc/finalize-session/**",
      "./src/features/rtc/host-controls/**",
      "./src/features/rtc/reactions/**",
      "./src/features/tags/select-feed-tags/**",
      "./src/features/user/delete-account/**",
      "./src/features/user/manage-user-block/**",
      "./src/features/user/save-social-login/**",
      "./src/widgets/feed/detail/**",
      "./src/widgets/feed/edit/**",
      "./src/widgets/profile/rtc-photo-preview/**",
      "./src/widgets/camera/capture-workspace/**",
      "./src/widgets/rtc/session-workspace/**",
    ],
    rules: {
      // 단일 소비여도 독립 상태, lifecycle 또는 실패 경계를 소유합니다.
      "fsd/insignificant-slice": "off",
    },
  },
  {
    files: ["./src/**/__tests__/**"],
    rules: {
      "fsd/forbidden-imports": "off",
      "fsd/no-public-api-sidestep": "off",
    },
  },
]);
