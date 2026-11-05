import { z } from "zod";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ required_error: `${label} est obligatoire.` })
    .trim()
    .min(min, `${label} : ${min} caractères minimum.`)
    .max(max, `${label} : ${max} caractères maximum.`);

export const email = z
  .string({ required_error: "L'e-mail est obligatoire." })
  .trim()
  .toLowerCase()
  .max(160, "E-mail trop long.")
  .email("Adresse e-mail invalide.");

export const password = z
  .string({ required_error: "Le mot de passe est obligatoire." })
  .min(8, "8 caractères minimum.")
  .max(72, "72 caractères maximum.")
  .regex(/[A-Za-z]/, "Au moins une lettre.")
  .regex(/[0-9]/, "Au moins un chiffre.");

export const phone = z
  .string()
  .trim()
  .max(20, "Numéro trop long.")
  .regex(/^[+0-9 .()-]*$/, "Numéro de téléphone invalide.")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `${max} caractères maximum.`)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

const time = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide (HH:MM).")
  .nullable()
  .optional()
  .or(z.literal("").transform(() => null));

export const RegisterSchema = z.object({
  fullName: trimmed(2, 80, "Le nom"),
  email,
  phone,
  password,
});

export const LoginSchema = z.object({ email, password: z.string().min(1, "Mot de passe requis.").max(72) });
export const ForgotSchema = z.object({ email });
export const ResetSchema = z.object({ token: z.string().min(20).max(100), password });

export const ProfileSchema = z.object({ fullName: trimmed(2, 80, "Le nom"), phone });
export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis.").max(72),
  newPassword: password,
});
export const DeleteAccountSchema = z.object({ password: z.string().min(1, "Mot de passe requis.").max(72) });

export const ContactSchema = z.object({
  name: trimmed(2, 80, "Le nom"),
  email,
  phone,
  message: trimmed(10, 2000, "Le message"),
  // Champ piège invisible : rempli seulement par les robots
  website: z.string().max(0).optional(),
});

export const OrderSchema = z.object({
  locationId: z.number().int().positive(),
  pickupDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide."),
  pickupTime: time,
  note: optionalText(300),
  phone,
  items: z
    .array(z.object({ menuItemId: z.number().int().positive(), quantity: z.number().int().min(1).max(50) }))
    .min(1, "Votre panier est vide.")
    .max(30, "Trop d'articles différents."),
});

export const OrderStatus = z.enum(["received", "preparing", "ready", "collected", "cancelled"]);

export const CategorySchema = z.object({
  name: trimmed(2, 60, "Le nom"),
  position: z.number().int().min(0).max(1000).default(0),
});

export const MenuItemSchema = z.object({
  categoryId: z.number().int().positive("Choisissez une catégorie."),
  name: trimmed(2, 80, "Le nom"),
  description: optionalText(300),
  priceCents: z.number().int().min(0, "Prix invalide.").max(100000, "Prix trop élevé."),
  imageUrl: z
    .string()
    .trim()
    .max(300)
    .regex(/^(\/images\/[\w./-]+|https:\/\/[^\s"'<>]+)?$/, "Lien d'image invalide (https://… ou /images/…).")
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
  available: z.boolean().default(true),
  position: z.number().int().min(0).max(1000).default(0),
});

export const LocationSchema = z
  .object({
    name: trimmed(2, 80, "Le nom"),
    address: trimmed(2, 160, "L'adresse"),
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: time,
    endTime: time,
    notes: optionalText(300),
    active: z.boolean().default(true),
  })
  .refine((l) => !l.startTime || !l.endTime || l.startTime < l.endTime, {
    message: "L'heure de fin doit être après l'heure de début.",
    path: ["endTime"],
  });

export const RoleSchema = z.object({ role: z.enum(["client", "staff", "admin"]) });
