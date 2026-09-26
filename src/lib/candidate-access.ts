type CandidateAccessStatus = {
  status: string;
  reactivatedAt: Date | null;
  publishAt: Date | null;
  days: number;
};

/** RG-15: an explicitly disabled candidate stays disabled; reactivation overrides the timed closure. */
export function isCandidateAccessClosed(candidate: CandidateAccessStatus, now = new Date()): boolean {
  return (
    candidate.status === "disabled" ||
    (candidate.status === "failed" || candidate.status === "fraud") &&
      !candidate.reactivatedAt &&
      !!candidate.publishAt &&
      now.getTime() > candidate.publishAt.getTime() + candidate.days * 86400000
  );
}
