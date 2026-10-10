import { ERBIL_M120_LABEL_POLYGON } from "@shared/types";

export const ERBIL_M120_REGION = {
  type: "Feature" as const,
  properties: {},
  geometry: {
    type: "Polygon" as const,
    coordinates: [ERBIL_M120_LABEL_POLYGON],
  },
};
