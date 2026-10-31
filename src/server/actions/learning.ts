"use server";

import { getActor } from "@/server/auth/actor";
import { observationInput, publishInput, reasonInput, reportInput } from "@/lib/schemas";
import * as obs from "@/server/repo/observations";
import * as mod from "@/server/repo/moderation";
import * as shared from "@/server/repo/shared";
import { act, formObject, str } from "./util";

const OBS = (id: string) => `/portal/client/observations/${id}`;

export async function createObservationAction(fd: FormData) {
  await act("/portal/client/observations/new", async () => {
    const o = await obs.createObservation(await getActor(), observationInput.parse(formObject(fd)));
    return OBS(o.id);
  }, "Saved as a private draft. Nothing has been shared.");
}

export async function updateObservationAction(id: string, fd: FormData) {
  await act(`${OBS(id)}?edit=1`, async () => {
    await obs.updateObservation(await getActor(), id, observationInput.parse(formObject(fd)));
    return OBS(id);
  }, "Changes saved. Still not shared until you submit.");
}

export async function submitObservationAction(id: string) {
  await act(OBS(id), async () => obs.submitObservation(await getActor(), id), "Submitted for moderator review.");
}

export async function withdrawObservationAction(id: string) {
  await act(OBS(id), async () => obs.withdrawObservation(await getActor(), id), "Withdrawn. The shared copy is gone from feed, search, themes and AIRA.");
}

export async function reviseObservationAction(id: string) {
  await act(OBS(id), async () => {
    const draft = await obs.reviseObservation(await getActor(), id);
    return `${OBS(draft.id)}?edit=1`;
  });
}

// ───────── Moderation ─────────

const REVIEW = (id: string) => `/portal/moderation/${id}`;

export async function claimAction(id: string) {
  await act(REVIEW(id), async () => mod.claim(await getActor(), id));
}

export async function returnAction(id: string, fd: FormData) {
  await act(REVIEW(id), async () => {
    await mod.returnForClarification(await getActor(), id, reasonInput.parse(formObject(fd)).reason);
    return "/portal/moderation";
  }, "Returned to the author for clarification.");
}

export async function rejectAction(id: string, fd: FormData) {
  await act(REVIEW(id), async () => {
    await mod.reject(await getActor(), id, reasonInput.parse(formObject(fd)).reason);
    return "/portal/moderation";
  }, "Rejected; the author has been notified.");
}

export async function publishAction(id: string, fd: FormData) {
  await act(REVIEW(id), async () => {
    const s = await mod.publish(await getActor(), id, publishInput.parse(formObject(fd)));
    return `/portal/learning/${s.publicRef}`;
  }, "Published a reviewed shared copy.");
}

export async function suspendAction(ref: string, fd: FormData) {
  await act("/portal/moderation", async () => mod.suspendShared(await getActor(), ref, reasonInput.parse(formObject(fd)).reason), `${ref} temporarily unpublished.`);
}

export async function reinstateAction(ref: string, fd: FormData) {
  await act("/portal/moderation", async () => mod.reinstateShared(await getActor(), ref, reasonInput.parse(formObject(fd)).reason), `${ref} reinstated.`);
}

export async function removeAction(ref: string, fd: FormData) {
  await act("/portal/moderation", async () => mod.removeShared(await getActor(), ref, reasonInput.parse(formObject(fd)).reason), `${ref} removed.`);
}

export async function dismissReportAction(reportId: string, fd: FormData) {
  await act("/portal/moderation", async () => mod.dismissReport(await getActor(), reportId, reasonInput.parse(formObject(fd)).reason), "Report closed.");
}

// ───────── Shared feed interactions ─────────

export async function reportSharedAction(ref: string, fd: FormData) {
  await act(`/portal/learning/${ref}`, async () => {
    const r = reportInput.parse(formObject(fd));
    await shared.reportShared(await getActor(), ref, r.reason, r.details);
  }, "Thanks — a moderator will review your report.");
}

export async function bookmarkAction(ref: string) {
  await act(`/portal/learning/${ref}`, async () => shared.toggleBookmark(await getActor(), ref));
}

export async function feedbackAction(ref: string, fd: FormData) {
  await act(`/portal/learning/${ref}`, async () => {
    const kind = str(fd, "kind") === "NEEDS_EVIDENCE" ? "NEEDS_EVIDENCE" : "USEFUL";
    await shared.setFeedback(await getActor(), ref, kind);
  }, "Feedback recorded.");
}
