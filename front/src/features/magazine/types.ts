export type MagazineCategory = {
  id: number;
  name: string;
  slug: string;
};

export type MagazineTag = {
  id: number;
  name: string;
  slug: string;
};

export type MagazineImage = {
  url: string;
  alt: string;
};

export type MagazineArticle = {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  publishedAt: string;
  modifiedAt: string;
  authorName: string;
  image?: MagazineImage;
  categories: MagazineCategory[];
  tags: MagazineTag[];
  readingTime: number;
};

export type MagazineListResult = {
  items: MagazineArticle[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
};

export type MagazineQuery = {
  page?: number;
  perPage?: number;
  category?: number;
  tag?: number;
  exclude?: number[];
};
