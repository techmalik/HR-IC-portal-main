import { useEffect } from "react";

interface PageMeta {
  title: string;
  description: string;
  canonical: string;
  ogImage?: string;
}

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setCanonical(href: string) {
  let el = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

export function usePageMeta({ title, description, canonical, ogImage }: PageMeta) {
  useEffect(() => {
    const previousTitle = document.title;

    document.title = title;
    setMeta("description", description);
    setCanonical(canonical);

    setMeta("og:type", "website", "property");
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    setMeta("og:url", canonical, "property");
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
    }

    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", title, "name");
    setMeta("twitter:description", description, "name");
    if (ogImage) {
      setMeta("twitter:image", ogImage, "name");
    }

    return () => {
      document.title = previousTitle;
    };
  }, [title, description, canonical, ogImage]);
}
