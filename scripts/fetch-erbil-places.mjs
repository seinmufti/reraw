const q = `[out:json][timeout:25];
(
  node["place"~"neighbourhood|suburb|quarter"](36.02,43.82,36.32,44.18);
);
out body 200;`;

const res = await fetch("https://overpass.kumi.systems/api/interpreter", {
  method: "POST",
  body: "data=" + encodeURIComponent(q),
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
});
const data = await res.json();
const center = { lat: 36.191, lng: 44.009 };
const dist = (a, b) =>
  Math.hypot((a.lat - b.lat) * 111, (a.lng - b.lng) * 85);

const items = data.elements
  .map((e) => ({
    name: e.tags?.name || e.tags?.["name:en"] || e.tags?.["name:ckb"],
    lat: e.lat,
    lng: e.lon,
    place: e.tags?.place,
    km: dist(center, { lat: e.lat, lng: e.lon }),
  }))
  .filter((x) => x.name)
  .sort((a, b) => a.km - b.km);

console.log("count", items.length);
for (const x of items) {
  console.log(x.km.toFixed(2), x.place, x.name, x.lat.toFixed(4), x.lng.toFixed(4));
}
