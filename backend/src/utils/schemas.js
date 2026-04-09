const { z } = require("zod");

const authRegisterSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const authLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
});

const hostelCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
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
