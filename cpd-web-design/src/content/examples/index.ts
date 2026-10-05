/**
 * Registry of example sites. To add an industry (e.g. a gym):
 *  1. Copy salon.ts → gym.ts and edit the content + `gymMeta.features`.
 *  2. Copy src/components/examples/salon/ → gym/ and adjust the layout.
 *  3. Add src/app/examples/gym/page.tsx (copy the salon one).
 *  4. Add `gymMeta` to the list below. It then appears on the home page,
 *     in /examples, in the "What you get" table and in the sitemap.
 */
import { hotelMeta } from "./hotel";
import { portfolioMeta } from "./portfolio";
import { restaurantMeta } from "./restaurant";
import { salonMeta } from "./salon";
import { toursMeta } from "./tours";
import { yogaMeta } from "./yoga";
import type { ExampleMeta } from "./types";

export const examples: ExampleMeta[] = [restaurantMeta, hotelMeta, toursMeta, salonMeta, yogaMeta, portfolioMeta];
