import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { getFirestore } from "firebase-admin/firestore";
import { getFunctions } from "firebase-admin/functions";
import { generateStitchUI } from "./stitch.js";

/**
 * Asynchronous Stitch UI generation for production.
 *
 * Why async: a single Stitch screen takes 40s+ to generate, which is longer
 * than the ~60s timeout Firebase Hosting applies when it rewrites `/api/**`
 * to this Cloud Function. The deployed app hit that ceiling, so the browser
 * saw an HTML 502 page and the client reported "Request failed" — even though
 * the screen had been created inside Stitch.
 *
 * Design:
 *   - POST /api/stitch-generate creates a job doc in Firestore
 *     (`stitchJobs/{jobId}`) with status "queued", enqueues a Cloud Task, and
 *     returns `{ jobId }` immediately (well under the Hosting timeout).
 *   - The Cloud Task worker runs the slow Stitch generation, then writes the
 *     HTML/screenshot (or error) back to the Firestore job doc.
 *   - GET /api/stitch-status/:jobId reads the job doc and the client polls it.
 *
 * Firestore is used as the job store (not in-memory) because Cloud Functions
 * are serverless — an in-memory map would not survive across instances.
 * The Admin SDK writes below are server-side only and bypass client rules.
 */

const QUEUE_NAME = "processStitchJob";

/**
 * Task queue function that performs the long-running Stitch generation.
 * The task payload is `{ jobId, prompt }`.
 * Runs with a generous (540s) timeout and enough memory for the HTML payload.
 */
export const processStitchJob = onTaskDispatched(
  {
    retryConfig: { maxAttempts: 3, minBackoffSeconds: 5, maxBackoffSeconds: 60 },
    timeoutSeconds: 540,
    memory: "1GiB",
    maxInstances: 10,
  },
  async (req) => {
    const { jobId, prompt } = req.data as { jobId?: string; prompt?: string };
    if (!jobId || typeof jobId !== "string") {
      throw new Error("Missing jobId in task payload");
    }
    const jobRef = getFirestore().doc(`stitchJobs/${jobId}`);

    try {
      if (!prompt || typeof prompt !== "string") {
        throw new Error("Missing prompt in task payload");
      }
      await jobRef.update({ status: "running" });
      const result = await generateStitchUI(prompt);
      await jobRef.update({
        status: "done",
        html: result.html,
        imageUrl: result.imageUrl,
        error: null,
        updatedAt: new Date().toISOString(),
      });
    } catch (err: any) {
      console.error(`[stitch job ${jobId}] failed:`, err.message);
      await jobRef.update({
        status: "error",
        error: err.message || "Failed to generate UI",
        updatedAt: new Date().toISOString(),
      });
      // Re-throw so Cloud Tasks knows the task failed and can retry.
      throw err;
    }
  }
);

/**
 * Creates a Firestore stitch job and enqueues it to the Cloud Task queue.
 * Returns the jobId. The worker writes the result back to
 * `stitchJobs/{jobId}`.
 */
export async function enqueueStitchJob(prompt: string): Promise<string> {
  const db = getFirestore();
  const jobId = randomId();
  await db.doc(`stitchJobs/${jobId}`).set({
    status: "queued",
    prompt,
    createdAt: new Date().toISOString(),
  });

  const queue = getFunctions().taskQueue<{ jobId: string; prompt: string }>(
    QUEUE_NAME
  );
  await queue.enqueue({ jobId, prompt });
  return jobId;
}

function randomId(): string {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2, 10) +
    Math.random().toString(36).slice(2, 6)
  );
}
