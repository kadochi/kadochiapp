import "server-only";

import { env } from "./server/env";

export type WordPressSiteInfo = {
  connected: boolean;
  name: string;
  description: string;
  url: string;
  error?: string;
};

type WordPressApiRootResponse = {
  name?: string;
  description?: string;
  url?: string;
};

/** Fetches WordPress server-to-server; browser code should use NEXT_PUBLIC_WORDPRESS_URL instead. */
export async function getWordPressSiteInfo(): Promise<WordPressSiteInfo> {
  try {
    const response = await fetch(`${env.WORDPRESS_INTERNAL_URL}/wp-json/`, {
      cache: "no-store"
    });

    if (!response.ok) {
      return { connected: false, name: "", description: "", url: "", error: `WordPress responded with ${response.status}.` };
    }

    const settings = (await response.json()) as WordPressApiRootResponse;
    return {
      connected: true,
      name: settings.name ?? "WordPress",
      description: settings.description ?? "",
      url: settings.url ?? env.WORDPRESS_INTERNAL_URL
    };
  } catch {
    return { connected: false, name: "", description: "", url: "", error: "Could not reach WordPress yet." };
  }
}
