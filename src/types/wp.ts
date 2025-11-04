// Base WordPress REST API shapes used across the app
export interface WPMeta {
  id: number;
  key: string;
  value: string | number | boolean | null;
}

export interface WPMedia {
  id: number;
  date: string;
  slug: string;
  link: string;
  source_url: string;
  alt_text?: string;
  media_type?: string;
  mime_type?: string;
  title?: { rendered: string };
  media_details?: {
    width?: number;
    height?: number;
    sizes?: Record<
      string,
      { source_url: string; width: number; height: number }
    >;
  };
}

export interface WPPostBase {
  id: number;
  date: string;
  slug: string;
  link: string;
  status: "publish" | "draft" | string;
  title: { rendered: string };
  content?: { rendered: string; protected?: boolean };
  excerpt?: { rendered: string };
}

export interface WPPost extends WPPostBase {
  type: "post";
  categories?: number[];
  tags?: number[];
  featured_media?: number;
}

export interface WPPage extends WPPostBase {
  type: "page";
  parent?: number;
}

export type WPResponse<T> =
  | T
  | { code: string; message: string; data?: unknown };
