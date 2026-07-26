export type AvailabilityPartition = "available" | "unavailable";

export type AvailabilityPageSegment = {
  partition: AvailabilityPartition;
  page: number;
  offset: number;
  take: number;
};

type AvailabilityPageInput = {
  page: number;
  perPage: number;
  availableTotal: number;
  unavailableTotal: number;
};

/**
 * Describes the slices needed for one availability-first catalog page. Each
 * partition keeps Woo's requested ordering; only the partition boundary moves.
 */
export function availabilityFirstPage({
  page,
  perPage,
  availableTotal,
  unavailableTotal,
}: AvailabilityPageInput) {
  const total = availableTotal + unavailableTotal;
  const totalPages = Math.ceil(total / perPage);
  const start = (page - 1) * perPage;
  const segments: AvailabilityPageSegment[] = [];

  if (start < availableTotal) {
    const offset = start % perPage;
    const take = Math.min(perPage, availableTotal - start);
    segments.push({ partition: "available", page: Math.floor(start / perPage) + 1, offset, take });

    if (take < perPage && unavailableTotal > 0) {
      segments.push({ partition: "unavailable", page: 1, offset: 0, take: perPage - take });
    }
  } else if (start < total) {
    const unavailableStart = start - availableTotal;
    segments.push({
      partition: "unavailable",
      page: Math.floor(unavailableStart / perPage) + 1,
      offset: unavailableStart % perPage,
      take: Math.min(perPage, unavailableTotal - unavailableStart),
    });
  }

  return { segments, total, totalPages };
}
