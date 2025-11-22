export const APP_ROUTE_PREFIX = "/app"
export const APP_HASH_PREFIX = "/app"

// Map a real Next.js route (e.g. /app/home) to a hash path (e.g. /app/home).
export const routePathToHashPath = (pathname: string): string | null => {
  if (!pathname.startsWith(APP_ROUTE_PREFIX)) {
    return null
  }

  const rest = pathname.slice(APP_ROUTE_PREFIX.length) // "" | "/home" | "/calendar"

  if (rest === "" || rest === "/") {
    return `${APP_HASH_PREFIX}/home`
  }

  return `${APP_HASH_PREFIX}${rest}`
}

// Map a hash path (e.g. /app/home) back to the real route (e.g. /app/home).
export const hashPathToRoutePath = (hashPath: string): string | null => {
  if (!hashPath.startsWith(APP_HASH_PREFIX)) {
    return null
  }

  const rest = hashPath.slice(APP_HASH_PREFIX.length) // "" | "/home" | "/dashboard" | "/messaging/1"

  if (rest === "" || rest === "/") {
    return `${APP_ROUTE_PREFIX}/home`
  }

  // Collapse any messaging sub-paths (e.g. /app/messaging/1) back to the base
  // Next.js route, since we handle the contact selection via the hash and
  // client-side state on the messaging page.
  if (rest === "/messaging" || rest.startsWith("/messaging/")) {
    return `${APP_ROUTE_PREFIX}/messaging`
  }

  return `${APP_ROUTE_PREFIX}${rest}`
}


