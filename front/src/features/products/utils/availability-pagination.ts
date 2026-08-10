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

  const appendSegments = (
    partition: AvailabilityPartition,
    partitionStart: number,
    requestedCount: number,
  ) => {
    let cursor = partitionStart;
    let remaining = requestedCount;

    while (remaining > 0) {
      const offset = cursor % perPage;
      const take = Math.min(remaining, perPage - offset);
      segments.push({
        partition,
        page: Math.floor(cursor / perPage) + 1,
        offset,
        take,
      });
      cursor += take;
      remaining -= take;
    }
  };

  if (start < availableTotal) {
    const take = Math.min(perPage, availableTotal - start);
    appendSegments("available", start, take);

    if (take < perPage && unavailableTotal > 0) {
      appendSegments("unavailable", 0, Math.min(perPage - take, unavailableTotal));
    }
  } else if (start < total) {
    const unavailableStart = start - availableTotal;
    appendSegments("unavailable", unavailableStart, Math.min(perPage, unavailableTotal - unavailableStart));
  }

  return { segments, total, totalPages };
}
