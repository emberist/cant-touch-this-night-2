import { listJobs } from "@/lib/generator";

export function GET(): Response {
  const jobs = listJobs();
  return Response.json(jobs);
}
