// backend/validation/schemas.js
const { z } = require("zod");

// --- login body (unchanged)
const LoginBody = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1), // only existence check at login
});

// --- session body (keep for now; delete later if unused)
const SessionBody = z.object({
  userId: z.number().nonnegative(),
});

// --- admin creates client: email + org_id (NEW)
const CreateClientBody = z.object({
  email: z.string().email().max(254),
  org_id: z.number().int().positive(),
});

// --- legacy whitelist add (you can stop using this once all callers use CreateClientBody)
const WhitelistAddBody = z.object({
  email: z.string().email().max(254),
});

// --- whitelist delete (unchanged)
const WhitelistDeleteBody = z.object({
  email: z.string().email().max(254),
});

// --- password change policy (unchanged; route currently uses strongEnough)
const ChangePasswordBody = z.object({
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(12, "Password must be at least 12 characters long")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[0-9]/, "Password must include a digit")
    .regex(/[^A-Za-z0-9]/, "Password must include a special character"),
});

module.exports = {
  // keep/export SessionBody only if something still imports it
  SessionBody,
  LoginBody,
  WhitelistAddBody,   // can be deprecated later
  WhitelistDeleteBody,
  ChangePasswordBody,
  CreateClientBody,   // <-- new export
};
