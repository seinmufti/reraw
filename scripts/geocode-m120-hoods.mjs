/** Geocode neighbourhood names inside Erbil M120 viewbox (bounded Nominatim). */
const names = [
  "Mamostayan",
  "Setaqan",
  "Shorsh",
  "Iskan",
  "Tairawa",
  "Saydawa",
  "Nishtiman",
  "Mantikawa",
  "Badawa",
  "Rapareen",
  "Sarwaran",
  "Gulan",
  "Ankawa",
];

const viewbox = "43.979,36.218,44.040,36.166"; // left, top, right, bottom

function insideM120(lat, lng) {
  return lat >= 36.166 && lat <= 36.218 && lng >= 43.979 && lng <= 44.04;
}

const out = [];
for (const name of names) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${name}, Erbil, Kurdistan`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("viewbox", viewbox);
  url.searchParams.set("bounded", "1");
  const res = await fetch(url, { headers: { "User-Agent": "reraw-dev/1.0" } });
  const hits = await res.json();
  await new Promise((r) => setTimeout(r, 1100));
  const hit =
    hits.find((h) => insideM120(+h.lat, +h.lon)) ??
    hits.find((h) => h.display_name?.includes("Erbil")) ??
    hits[0];
  if (!hit) {
    console.error("MISS", name);
    continue;
  }
  const lat = +hit.lat;
  const lng = +hit.lon;
  if (!insideM120(lat, lng)) {
    console.error("OUTSIDE", name, lat, lng, hit.display_name);
    continue;
  }
  out.push({
    id: name.toLowerCase().replace(/\s+/g, "-"),
    name,
    lat: +lat.toFixed(6),
    lng: +lng.toFixed(6),
    minZoom: 10,
  });
}
console.log(JSON.stringify(out, null, 2));
