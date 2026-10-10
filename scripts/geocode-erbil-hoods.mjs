const names = [
  "Badawa",
  "Mamostayan",
  "Shorsh",
  "Setaqan",
  "Iskan",
  "Mantikawa",
  "Sarwaran",
  "Tairawa",
  "Rapareen",
  "Saydawa",
  "Chnar",
  "Brayaty",
  "Mufti",
  "Komary",
  "Galawezh",
  "Ronaky",
  "Sharawani",
  "Nishtiman",
  "Havalan",
  "Kany",
  "Zagros",
  "Khanzad",
  "Chwar Chra",
];

const center = { lat: 36.191, lng: 44.009 };
const inner = { minLat: 36.165, maxLat: 36.218, minLng: 43.978, maxLng: 44.042 };

for (const name of names) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", `${name}, Erbil, Iraq`);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  const res = await fetch(url, { headers: { "User-Agent": "reraw-dev/1.0" } });
  const hit = (await res.json())[0];
  await new Promise((r) => setTimeout(r, 1100));
  if (!hit) {
    console.log("MISS", name);
    continue;
  }
  const lat = +hit.lat;
  const lng = +hit.lon;
  const inside =
    lat >= inner.minLat &&
    lat <= inner.maxLat &&
    lng >= inner.minLng &&
    lng <= inner.maxLng;
  console.log(
    JSON.stringify({
      id: name.toLowerCase().replace(/\s+/g, "-"),
      name,
      lat,
      lng,
      minZoom: 10,
      inside,
    }),
  );
}
