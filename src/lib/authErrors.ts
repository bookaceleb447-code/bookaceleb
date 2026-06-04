/**
 * Log full Firebase errors internally and map to friendly user messages.
 */
export function getFriendlyLoginError(err: any): string {
  // Log full error internally
  console.error("Internal Login Error Logged:", err);

  const message = err?.message || String(err);
  const code = err?.code || "";

  // 1. Wrong email or password
  if (
    code === "auth/invalid-credential" || 
    code === "auth/wrong-password" ||
    message.includes("auth/invalid-credential") ||
    message.includes("auth/wrong-password") ||
    message.includes("invalid-credential") ||
    message.includes("wrong password") ||
    message.includes("wrong-password")
  ) {
    return "Invalid email or password.";
  }

  // 2. Account not found
  if (
    code === "auth/user-not-found" ||
    message.includes("auth/user-not-found") ||
    message.includes("user-not-found") ||
    message.includes("User record not found") ||
    message.includes("account found") ||
    message.includes("user-invalid")
  ) {
    return "No account found with this email.";
  }

  // 3. Too many attempts
  if (
    code === "auth/too-many-requests" ||
    message.includes("auth/too-many-requests") ||
    message.includes("too-many-requests") ||
    message.includes("too many attempts")
  ) {
    return "Too many login attempts. Please try again later.";
  }

  // 4. Account disabled
  if (
    code === "auth/user-disabled" ||
    message.includes("auth/user-disabled") ||
    message.includes("user-disabled") ||
    message.includes("suspended or banned") ||
    message.includes("suspended") ||
    message.includes("banned")
  ) {
    return "This account has been temporarily disabled.";
  }

  // 5. Network error
  if (
    code === "auth/network-request-failed" ||
    message.includes("auth/network-request-failed") ||
    message.includes("network-request-failed") ||
    message.includes("network-error") ||
    message.includes("connection-problem") ||
    message.includes("Connection problem")
  ) {
    return "Connection problem. Please try again.";
  }

  // 6. Default fallback (e.g. Unauthorized portals)
  // Ensure we don't leak "Firebase", "auth/", "FirebaseError", etc.
  if (
    message.includes("Firebase") ||
    message.includes("auth/") ||
    message.includes("FirebaseError") ||
    message.includes("SDK")
  ) {
    return "Unable to complete login. Please try again.";
  }

  return message;
}

export function getFriendlyRegisterError(err: any): string {
  // Log full error internally
  console.error("Internal Registration Error Logged:", err);

  const message = err?.message || String(err);
  const code = err?.code || "";

  // 1. Email already exists
  if (
    code === "auth/email-already-in-use" ||
    message.includes("auth/email-already-in-use") ||
    message.includes("email-already-in-use") ||
    message.includes("email already in use") ||
    message.includes("already-in-use")
  ) {
    return "This email address is already in use.";
  }

  // 2. Weak password
  if (
    code === "auth/weak-password" ||
    message.includes("auth/weak-password") ||
    message.includes("weak-password") ||
    message.includes("Password must be") ||
    message.includes("weak password")
  ) {
    return "Password must be at least 8 characters.";
  }

  // 3. Invalid email
  if (
    code === "auth/invalid-email" ||
    message.includes("auth/invalid-email") ||
    message.includes("invalid-email") ||
    message.includes("invalid email")
  ) {
    return "Please enter a valid email address.";
  }

  // 4. Registration disabled
  if (
    code === "auth/admin-restricted-operation" ||
    message.includes("auth/admin-restricted-operation") ||
    message.includes("registration disabled") ||
    message.includes("Registration is temporarily")
  ) {
    return "Registration is temporarily unavailable.";
  }

  // 5. Network error
  if (
    code === "auth/network-request-failed" ||
    message.includes("auth/network-request-failed") ||
    message.includes("network-request-failed") ||
    message.includes("network-error")
  ) {
    return "Connection problem. Please try again.";
  }

  // 6. Unknown error & safety check (Ensure we don't leak Firebase/auth details)
  return "Unable to complete registration. Please try again.";
}
