"use server";

import { demoRequestInput, eventRegistrationInput } from "@/lib/schemas";
import { createDemoRequest, createEventRegistration } from "@/server/repo/catalog";
import { signIn, signOut } from "@/auth";
import { act, formObject, str } from "./util";

export async function demoRequestAction(fd: FormData) {
  await act("/demo", async () => {
    await createDemoRequest(demoRequestInput.parse(formObject(fd)));
  }, "Thanks — your demo request was recorded. Our team will be in touch.");
}

export async function hackathonRegisterAction(fd: FormData) {
  await act("/hackathon", async () => {
    await createEventRegistration(eventRegistrationInput.parse(formObject(fd)));
  }, "You're registered. Confirmation email delivery is not part of this prototype.");
}

export async function signInAction(fd: FormData) {
  const callbackUrl = str(fd, "callbackUrl");
  await signIn("nodemailer", { email: str(fd, "email").trim().toLowerCase(), redirectTo: callbackUrl.startsWith("/") ? callbackUrl : "/portal" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
