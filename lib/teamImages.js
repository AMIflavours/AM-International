// Default (fallback) team photos. The admin can replace each one under About > Team; an admin value always wins.
export const TEAM_IMAGES = [
  "/images/team/muhammad-ali-hassan.jpg",
  "/images/team/nayyer-hameed.jpg",
  "/images/team/ahmad-mustafa.jpg",
  "/images/team/mahad-bin-hassan.jpg",
];

export function withTeamImages(about) {
  if (!about || !Array.isArray(about.team)) return about;
  return { ...about, team: about.team.map((p, i) => (TEAM_IMAGES[i] ? { ...p, image: TEAM_IMAGES[i] } : p)) };
}
