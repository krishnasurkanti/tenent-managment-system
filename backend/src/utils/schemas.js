const { z } = require("zod");

const authRegisterSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const authLoginSchema = z.object({
  email: z.string().trim().email().optional(),
  username: z.string().trim().min(3).max(64).optional(),
  password: z.string().min(8).max(128),
}).refine((value) => Boolean(value.email || value.username), {
  message: "Either email or username is required.",
  path: ["email"],
});

const hostelCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(280),
  floors: z.array(
    z.object({
      id: z.string().trim().min(1).max(160),
      floorLabel: z.string().trim().min(1).max(160),
      rooms: z.array(
        z.object({
          id: z.string().trim().min(1).max(160),
          roomNumber: z.string().trim().min(1).max(40),
          bedCount: z.coerce.number().int().positive(),
          sharingType: z.string().trim().min(1).max(120),
        }),
      ).min(1),
    }),
  ).min(1),
});

const tenantCreateSchema = z
  .object({
    hostel_id: z.coerce.number().int().positive(),
  })
  .passthrough();

const tenantListSchema = z.object({
  hostel_id: z.coerce.number().int().positive(),
});

module.exports = {
  authRegisterSchema,
  authLoginSchema,
  hostelCreateSchema,
  tenantCreateSchema,
  tenantListSchema,
};
