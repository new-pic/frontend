import { Button, ButtonText, Center, Text, VStack } from "@shared/ui";
import { useAppTranslation } from "@shared/lib";
import { Image } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function NotFoundPage() {
  const { t } = useAppTranslation();

  return (
    <SafeAreaView>
      <VStack className="h-full px-8">
        <Center className="flex-1 mb-10">
          <Image
            source={require("@assets/images/brand-character/404_newpic.png")}
            alt={t("notFound.imageAccessibility")}
            className="w-full h-70"
            resizeMode="contain"
          />
          <VStack space="sm">
            <Text size="xl">{t("notFound.title")}</Text>
            <Text>{t("notFound.description")}</Text>
          </VStack>
        </Center>
        <Button variant="outline" size="lg">
          <ButtonText>{t("notFound.goHome")}</ButtonText>
        </Button>
      </VStack>
    </SafeAreaView>
  );
}
