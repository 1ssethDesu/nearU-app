import { Stack } from "expo-router";
import { useEffect } from "react";
import { useShareIntent } from "expo-share-intent";
import "../global.css";

export default function RootLayout() {
  const { hasShareIntent, shareIntent, resetShareIntent, error } = useShareIntent();

  useEffect(() => {
    if (hasShareIntent && shareIntent) {
      const url = shareIntent.webUrl || shareIntent.text;
      if (url) {
        console.log('Shared URL:', url);
        // We will handle the URL processing here later
        resetShareIntent();
      }
    }
  }, [hasShareIntent, shareIntent]);

  return <Stack />;
}
