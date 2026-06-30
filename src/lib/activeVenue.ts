import { cookies } from "next/headers";
import { prisma } from "./prisma";

export async function getActiveVenue(userId: string) {
  const activeVenueId = cookies().get("venue-active")?.value;
  if (activeVenueId) {
    const venue = await prisma.venue.findFirst({ where: { id: activeVenueId, userId } });
    if (venue) return venue;
  }
  return prisma.venue.findFirst({ where: { userId }, orderBy: { name: "asc" } });
}
