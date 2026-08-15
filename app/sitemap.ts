import { MetadataRoute } from "next";
import { mergeToolPublishState } from "../lib/tools";
import { loadToolPublishState } from "../lib/tool-publish";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const staticPages: MetadataRoute.Sitemap = ["", "all-tools", "about", "faq", "contact", "privacy", "terms"].map((slug) => ({ url: `${base}/${slug}`, changeFrequency: "weekly" as const, priority: slug === "" ? 1 : .7 }));
  const state = await loadToolPublishState();
  const toolPages: MetadataRoute.Sitemap = mergeToolPublishState(state).filter((tool) => tool.published).map((tool) => ({ url: `${base}/${tool.slug}`, changeFrequency: "monthly" as const, priority: tool.popular ? .9 : .6 }));
  return staticPages.concat(toolPages);
}
