// scripts/build-feed.js
import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const SHOPIFY_FEED_URL = "https://idyl.com/pages/borderfree-xml-feed";
const OUTPUT_FILE = path.join(process.cwd(), "feed.xml");

function extractBorderfreeFeed(html) {
  const match = html.match(/window\.borderfreeFeed\s*=\s*({[\s\S]*?});/);
  if (!match) {
    throw new Error("Could not find window.borderfreeFeed in HTML");
  }

  const jsonString = match[1];
  const obj = Function(`"use strict"; return (${jsonString});`)();
  return obj;
}

function escapeXml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(feed) {
  const { shop, items } = feed;

  const header = `<?xml version="1.0" encoding="UTF-8"?>`;
  const openRss = `<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">`;
  const closeRss = `</rss>`;

  const channelOpen = `<channel>
  <title>${escapeXml(shop.name)}</title>
  <link>${escapeXml(shop.url)}</link>
  <description>${escapeXml(shop.description || shop.name)}</description>`;

  const channelClose = `</channel>`;

  const itemXml = items
    .map((item) => {
      return `  <item>
    <g:id>${escapeXml(item.id)}</g:id>
    <g:title><![CDATA[${item.title}]]></g:title>
    <g:description><![CDATA[${item.description || ""}]]></g:description>
    <g:link>${escapeXml(item.link)}</g:link>
    <g:image_link>${escapeXml(item.image_link)}</g:image_link>
    <g:availability>${escapeXml(item.availability)}</g:availability>
    <g:price>${escapeXml(item.price.amount)} ${escapeXml(
        item.price.currency
      )}</g:price>
        <g:sale_price>${escapeXml(item.price.amount)} ${escapeXml(
        item.price.currency
      )}</g:sale_price>
  </item>`;
    })
    .join("\n");

  return [
    header,
    openRss,
    channelOpen,
    itemXml,
    channelClose,
    closeRss,
  ].join("\n");
}

async function main() {
  const res = await fetch(SHOPIFY_FEED_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch Shopify page: ${res.status}`);
  }

  const html = await res.text();
  const feed = extractBorderfreeFeed(html);
  const xml = buildXml(feed);

  fs.writeFileSync(OUTPUT_FILE, xml, "utf8");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});