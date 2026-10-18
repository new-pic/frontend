import { Badge, BadgeText, Box, Text, VStack } from "@shared/ui";
import { useMemo } from "react";
import { formatRtcStoredPhotoCreatedAt } from "../lib/rtc-stored-photo-details";
import { useRtcStoredPhotoExpiryState } from "../model/use-rtc-stored-photo-expiry-state";

export function RtcStoredPhotoExpiryBadge({
  expiresAt,
}: {
  expiresAt: string;
}) {
  const { t } = useAppTranslation();
  const expiryState = useRtcStoredPhotoExpiryState(expiresAt);
  if (expiryState !== "EXPIRING_SOON") return null;

  return (
    <Box pointerEvents="none" className="absolute right-4 top-4">
      <Badge variant="destructive" className="rounded-full px-3 py-2">
        <BadgeText className="normal-case">
          {t("profile.expiringSoon")}
        </BadgeText>
      </Badge>
    </Box>
  );
}

export function RtcStoredPhotoCreatedAt({ createdAt }: { createdAt: string }) {
  const { i18n, t } = useAppTranslation();
  const formattedCreatedAt = useMemo(
    () => formatRtcStoredPhotoCreatedAt(createdAt, i18n.resolvedLanguage),
    [createdAt, i18n.resolvedLanguage],
  );
  if (!formattedCreatedAt) return null;

  return (
    <VStack className="items-center gap-1">
      <Text size="sm" className="text-label-muted">
        {t("profile.capturedAt")}
      </Text>
      <Text>{formattedCreatedAt}</Text>
    </VStack>
  );
}
import { useAppTranslation } from "@shared/lib";
