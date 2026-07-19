export function validateRoster(clubs) {
  if (!Array.isArray(clubs) || clubs.length < 2) throw new Error('Club roster is unavailable.')
  const ids = new Set()
  const slugs = new Set()
  for (const club of clubs) {
    if (!Number.isInteger(club.id) || !club.slug || !club.city || !club.name || !club.crest) {
      throw new Error('Club roster is invalid.')
    }
    if (ids.has(club.id) || slugs.has(club.slug)) throw new Error('Club roster is invalid.')
    ids.add(club.id)
    slugs.add(club.slug)
  }
  return clubs
}

export function clubLabel(club) {
  return `${club.city} ${club.name}`
}
