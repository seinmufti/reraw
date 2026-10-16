import type { I18nKey } from "./en";

/** Sorani Kurdish strings; missing keys (admin) fall back to English. */
export const ckb: Partial<Record<I18nKey, string>> = {
  appName: "ڕێڕەو",
  routes: "ڕێڕەوەکان",
  noRoutes: "ڕێڕەوەکان بەم زووانە زیاد دەکرێن.",
  neighborhoodsServed: "گەڕەکەکانی ڕێڕەو",
  stops: "وەستانگەکان",
  stopHopOn: "شوێنی سواربوون",
  stopTerminal: "کۆتاییگە / شوێنی کۆبوونەوە",
  stopEnd: "کۆتایی هێڵ",
  resetMapView: "گەڕانەوە بۆ دیمەنی سەرەتا",
  showAllRoutes: "هەموو ڕێڕەوەکان",
  cancel: "پاشگەزبوونەوە",
  loading: "بارکردن…",
  errorLoad: "نەتوانرا زانیاری باربکرێت.",
  developedBy: "پەرەپێدراوە لەلایەن",
  copyrightNotice: "© {year} nordlys. هەموو مافەکان پارێزراون.",
  close: "داخستن",
  switchLanguage: "English",
  pageTitle: "ڕێڕەو — ڕێڕەوی پاسەکانی هەولێر",
  pageDescription:
    "بزانە هەر هێڵێکی پاسی هەولێر بۆ کوێ دەچێت، کام گەڕەکەکان دەگرێتەوە و پاسەکان لە کوێ دەوەستن.",
  mapLoading: "نەخشە بار دەکرێت…",
  mapLoadError: "نەخشە بار نەبوو. پەیوەندی ئینتەرنێتەکەت بپشکنە.",
  madeIn: "دروستکراوە لە",
};
