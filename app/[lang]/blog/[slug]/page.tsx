import matter from 'gray-matter';
import fs from 'fs';
import path from 'path';
import { Metadata } from 'next/types';
import { getBlogFilePaths, getBlogPath } from '@/lib/blog';
import markdownToHtml from '@/lib/markdown';
import { BlogPostItem, BlogPostItemData } from '@/types/blog';
import { getMetadata } from '@/lib/seo';
import { decodeMdxFilePathData } from '@/lib/utils';
import { Blog } from '@/components/blog/blog';
import { Locale } from '@/i18n-config';
import { getDictionary } from '@/get-dictionary';
import LocalePrettyUrlsCache from '@/lib/locale-pretty-urls-cache';

type Params = {
  params: { slug?: string; lang: Locale };
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const blogPostItem = await generateBlogPostItem(params.lang, params.slug);

  const metaTags = getMetadata(
    blogPostItem.data.seo.metatitle || blogPostItem.data.title,
    blogPostItem.data.seo.metadescription || blogPostItem.data.title,
    blogPostItem.urlPath,
    blogPostItem.data.image || blogPostItem.data.seo.image
  );

  const title = blogPostItem.data.title;
  return {
    title: title,
    ...metaTags,
  };
}

export async function generateStaticParams({ params }: Params) {
  const lang = params.lang;
  return getBlogFilePaths(lang).map((filePath) => {
    const { prettyUrl } = decodeMdxFilePathData(filePath, lang);
    return {
      slug: prettyUrl,
    };
  });
}

export default async function Page({ params }: Params) {
  const blogPostItem = await generateBlogPostItem(params.lang, params.slug);

  const dictionary = await getDictionary(params.lang);

  return (
    <div className="relative">
      <Blog
        blogPostItem={blogPostItem}
        dictionary={dictionary}
        lang={params.lang}
      ></Blog>
    </div>
  );
}

async function generateBlogPostItem(lang: Locale, slug?: string) {
  if (!slug) {
    throw new Error('Blogpost must contain slug');
  }
  const postId = LocalePrettyUrlsCache.getId(slug);

  const filePath = `${postId}_${slug}.mdx`;
  const postFilePath = path.join(getBlogPath(lang), filePath);
  const source = fs.readFileSync(postFilePath);
  const { content, data } = matter(source);

  const contentHtml = await markdownToHtml(content || '');

  const blogPostItem: BlogPostItem = {
    id: decodeMdxFilePathData(filePath, lang).id,
    content: contentHtml,
    data: data as BlogPostItemData,
    filePath: `${slug}.mdx`,
    urlPath: `${lang}/blog/${slug}`,
  };
  return blogPostItem;
}
