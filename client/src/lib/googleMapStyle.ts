import type { Map } from "maplibre-gl";

/**
 * Recolours the OpenFreeMap "bright" style so it reads like Google Maps:
 * warm grey land, light-blue water, soft green parks, white streets with grey casings,
 * yellow/orange highways and grey labels. Only colours are touched — widths and opacities
 * belong to the road-boost helpers.
 */
const LAND = "#f2efe9";
const WATER = "#aadaff";
const PARK = "#c8e6c3";

type Rule = { test: RegExp; paint: Record<string, unknown> };

const RULES: Rule[] = [
  { test: /^background$/, paint: { "background-color": LAND } },

  // Land use
  { test: /^landuse-(residential|suburb)$/, paint: { "fill-opacity": 0 } },
  { test: /^landuse-commercial$/, paint: { "fill-color": "#efe9dc", "fill-opacity": 1 } },
  { test: /^landuse-industrial$/, paint: { "fill-color": "#ece8e0", "fill-opacity": 1 } },
  { test: /^landuse-cemetery$/, paint: { "fill-color": "#cfe3c9" } },
  { test: /^landuse-hospital$/, paint: { "fill-color": "#f6e1de" } },
  { test: /^landuse-school$/, paint: { "fill-color": "#f0e8d8" } },
  { test: /^landuse-railway$/, paint: { "fill-opacity": 0 } },
  { test: /^(park|landcover-grass|landcover-grass-park)$/, paint: { "fill-color": PARK } },
  { test: /^landcover-wood$/, paint: { "fill-color": "#b9dcb2" } },
  { test: /^landcover-sand$/, paint: { "fill-color": "#efe6c8" } },

  // Water
  { test: /^water(-intermittent)?$/, paint: { "fill-color": WATER } },
  { test: /^waterway/, paint: { "line-color": WATER } },

  // Buildings
  { test: /^building$/, paint: { "fill-color": "#e7e2d9", "fill-outline-color": "#d9d3c8" } },
  { test: /^building-top$/, paint: { "fill-color": "#ece8df" } },

  // Airport
  { test: /^aeroway-area$/, paint: { "fill-color": "#e6e3dc" } },
  { test: /^aeroway-(taxiway|runway)$/, paint: { "line-color": "#ffffff" } },
  { test: /^aeroway-.*casing$/, paint: { "line-color": "#d4d1c9" } },

  // Roads: casings
  { test: /^(highway|tunnel|bridge)-(motorway|motorway-link)-casing$/, paint: { "line-color": "#e1a23f" } },
  { test: /^(highway|tunnel|bridge)-(trunk|primary|trunk-primary|link)-casing$/, paint: { "line-color": "#e3c06f" } },
  { test: /^(highway|tunnel|bridge)-secondary-tertiary-casing$/, paint: { "line-color": "#d3d6db" } },
  { test: /^(highway|tunnel|bridge)-(minor|service-track)-casing$/, paint: { "line-color": "#d9dce1" } },

  // Roads: fills
  { test: /^(highway|tunnel|bridge)-(motorway|motorway-link)$/, paint: { "line-color": "#fbc96d" } },
  { test: /^(highway|tunnel|bridge)-(trunk|primary|trunk-primary|link)$/, paint: { "line-color": "#fde7a8" } },
  { test: /^(highway|tunnel|bridge)-secondary-tertiary$/, paint: { "line-color": "#ffffff" } },
  { test: /^(highway|tunnel|bridge)-(path|minor|service-track)$/, paint: { "line-color": "#ffffff" } },
  { test: /^(highway|tunnel|bridge)-path$/, paint: { "line-color": "#d8cfc0" } },
  { test: /^highway-area$/, paint: { "fill-color": "#e9e6df" } },

  // Rail
  { test: /^(railway|bridge-railway|tunnel-railway)/, paint: { "line-color": "#cfcbc4" } },

  // Boundaries
  { test: /^boundary_/, paint: { "line-color": "#b8bcc2" } },

  // Labels
  { test: /^(water_name|waterway_line_label)/, paint: { "text-color": "#5b8db8", "text-halo-color": "#e3f2fd" } },
  { test: /^highway-name-/, paint: { "text-color": "#5f6368", "text-halo-color": "#ffffff" } },
  { test: /^poi_/, paint: { "text-color": "#5f6368", "text-halo-color": "#ffffff" } },
  { test: /^airport$/, paint: { "text-color": "#5f6368", "text-halo-color": "#ffffff" } },
  { test: /^label_(other|village|town|city|city_capital)$/, paint: { "text-color": "#3c4043", "text-halo-color": "#ffffff" } },
  { test: /^label_(state|country_\d)$/, paint: { "text-color": "#5f6368", "text-halo-color": "#ffffff" } },
];

const PROP_PREFIX: Record<string, string> = {
  background: "background-",
  fill: "fill-",
  line: "line-",
  symbol: "text-",
};

export function applyGoogleMapStyle(map: Map) {
  for (const layer of map.getStyle().layers) {
    for (const rule of RULES) {
      if (!rule.test.test(layer.id)) continue;
      for (const [prop, value] of Object.entries(rule.paint)) {
        if (!prop.startsWith(PROP_PREFIX[layer.type] ?? "")) continue;
        try {
          map.setPaintProperty(layer.id, prop as never, value as never);
        } catch {
          /* property not valid for this layer */
        }
      }
    }
  }
}
