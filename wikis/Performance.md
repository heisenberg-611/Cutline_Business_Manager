## Performance & Latency Optimizations

Cutline OS implements strict performance patterns to ensure near-instant navigation and snappy UI updates, particularly crucial for the dense data dashboards.

### 1. Database Query Optimization
* **Selective Fetching:** We avoid massive relational payloads (like pulling `lineItems` for every invoice in a list, or `assets` for archived projects). Queries are strictly scoped to minimize payload size and parsing overhead.
* **Prisma Accelerate Caching:** Heavy analytical queries (like `getStudioHealth` or `getRevenueTrend`) utilize Prisma's edge caching (`cacheStrategy: { ttl: 30 }`). 
* **Targeted Cache Invalidation:** Caching is explicitly **disabled** on highly interactive CRUD lists (like Kanban boards or Client lists) to prevent "snapback" issues during optimistic drag-and-drop UI updates.

### 2. Next.js App Router Architecture
* **Suspense Boundaries:** Pages are wrapped in native Next.js `<Suspense>` boundaries via the `loading.tsx` file. This ensures that route transitions happen instantly on click, and the heavy database fetching streams into the page asynchronously rather than blocking the layout.
* **Perceived Performance:** While data streams in, users are presented with a highly polished CSS "Shimmer Sweep" skeleton loader (inspired by Vercel/Linear), requiring zero JavaScript to render.

### 3. Authentication Bottleneck Prevention
* **Zero Network Latency Auth:** Server components strictly use the `auth()` helper to decrypt the JWT locally (2-5ms). We strictly prohibit the use of `currentUser()` in blocking server components, as it makes a round-trip network request to Clerk's API, causing 150-300ms of unnecessary latency on every render.
* **Client-Side Offloading:** Non-critical user profile data (like rendering a first-name greeting) is offloaded to Client Components using the `useUser()` hook to keep the Server Component completely unblocked.
