const { z } = require("zod");

const authRegisterSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(128),
  name: z.string().trim().max(120).optional(),
  phoneNumber: z.string().trim().regex(/^\d{10,15}$/).optional(),
});

const authLoginSchema = z.object({
  // Accept any non-empty string — backend queries both email and phone_number columns
  email: z.string().trim().min(1).optional(),
  phoneNumber: z.string().trim().min(1).optional(),
  password: z.string().min(8).max(128),
}).refine((value) => Boolean(value.email || value.phoneNumber), {
  message: "Either email or phone number is required.",
  path: ["email"],
});

const hostelCreateSchema = z.object({
  name: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(280),
  type: z.enum(["PG", "RESIDENCE"]).optional(),
  floors: z.array(
    z.object({
      id: z.string().trim().min(1).max(160),
      floorLabel: z.string().trim().min(1).max(160),
      rooms: z.array(
        z.object({
          id: z.string().trim().min(1).max(160),
          roomNumber: z.string().trim().min(1).max(40),
          bedCount: z.coerce.number().int().positive(),
          sharingType: z.string().trim().min(1).max(120).optional(),
          unitId: z.string().trim().min(1).max(160).optional(),
          propertyType: z.enum(["PG", "RESIDENCE"]).optional(),
          beds: z.array(
            z.object({
              id: z.string().trim().min(1).max(160),
              label: z.string().trim().min(1).max(80),
            }),
          ).optional(),
        }),
      ).min(1),
    }),
  ).min(1),
});

const assignmentSchema = z
  .object({
    hostelId: z.string().trim().min(1).max(160).optional(),
    unitId: z.string().trim().max(160).optional(),
    roomNumber: z.string().trim().max(40).optional(),
    sharingType: z.string().trim().max(120).optional(),
    moveInDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    propertyType: z.enum(["PG", "RESIDENCE"]).optional(),
    bedId: z.string().trim().max(160).optional(),
    bedLabel: z.string().trim().max(80).optional(),
  })
  .optional()
  .nullable();

const paymentHistoryItemSchema = z.object({
  paymentId: z.string().max(128),
  amount: z.number().finite().nonnegative().max(10_000_000),
  paidOnDate: z.string(),
  nextDueDate: z.string(),
  status: z.string().max(20),
  paymentMethod: z.enum(["cash", "online"]),
  txnId: z.string().max(128).optional().default(""),
  proofImageName: z.string().max(256).optional().default(""),
  proofImageUrl: z.string().max(2048).optional().default(""),
  proofMimeType: z.string().max(64).optional().default(""),
});

const tenantCreateSchema = z.object({
  hostel_id: z.coerce.number().int().positive(),
  fullName: z.string().trim().min(1).max(160).optional(),
  fatherName: z.string().trim().max(160).optional(),
  dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  phone: z.string().trim().max(20).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  idType: z.string().trim().max(40).optional(),
  idNumber: z.string().trim().max(80).optional(),
  occupation: z.string().trim().max(120).optional(),
  workplaceName: z.string().trim().max(160).optional(),
  emergencyContactName: z.string().trim().max(160).optional(),
  emergencyContactRelation: z.string().trim().max(80).optional(),
  emergencyContactPhone: z.string().trim().max(20).optional(),
  monthlyRent: z.coerce.number().nonnegative().max(10_000_000).optional(),
  rentPaid: z.coerce.number().nonnegative().max(10_000_000).optional(),
  paidOnDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  nextDueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  billingAnchorDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  billingCycle: z.enum(["daily", "weekly", "monthly"]).optional(),
  tenantPhotoUrl: z.string().trim().max(2048).optional(),
  idPhotoUrl: z.string().trim().max(2048).optional(),
  assignment: assignmentSchema,
  paymentHistory: z.array(paymentHistoryItemSchema).max(120).optional(),
});

const tenantListSchema = z.object({
  hostel_id: z.coerce.number().int().positive().optional(),
});

const tenantUpdateSchema = z
  .object({
    hostel_id: z.coerce.number().int().positive().optional(),
    fullName: z.string().trim().min(1).max(160).optional(),
    fatherName: z.string().trim().max(160).optional(),
    dateOfBirth: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    phone: z.string().trim().max(20).optional(),
    email: z.string().trim().email().optional().or(z.literal("")),
    idType: z.string().trim().max(40).optional(),
    idNumber: z.string().trim().max(80).optional(),
    occupation: z.string().trim().max(120).optional(),
    workplaceName: z.string().trim().max(160).optional(),
    emergencyContactName: z.string().trim().max(160).optional(),
    emergencyContactRelation: z.string().trim().max(80).optional(),
    emergencyContactPhone: z.string().trim().max(20).optional(),
    monthlyRent: z.coerce.number().nonnegative().max(10_000_000).optional(),
    rentPaid: z.coerce.number().nonnegative().max(10_000_000).optional(),
    paidOnDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    nextDueDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    billingAnchorDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    billingCycle: z.enum(["daily", "weekly", "monthly"]).optional(),
    tenantPhotoUrl: z.string().trim().max(2048).optional(),
    idPhotoUrl: z.string().trim().max(2048).optional(),
    moveOutDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    assignment: assignmentSchema,
    paymentHistory: z.array(paymentHistoryItemSchema).max(120).optional(),
    expectedUpdatedAt: z.string().optional(),
  })
  .strict();

const registerWithKeySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  phoneNumber: z.string().trim().regex(/^\d{10,15}$/).optional(),
  password: z.string().min(8).max(128),
  hostelName: z.string().trim().min(1).max(160),
  hostelAddress: z.string().trim().min(1).max(280),
  hostelType: z.enum(["PG", "RESIDENCE"]).optional(),
  floors: z.array(z.unknown()).optional(),
});

const acceptInvitationSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
  phoneNumber: z.string().trim().regex(/^\d{10,15}$/).optional(),
  password: z.string().min(8).max(128),
});

module.exports = {
  authRegisterSchema,
  authLoginSchema,
  hostelCreateSchema,
  tenantCreateSchema,
  tenantListSchema,
  tenantUpdateSchema,
  registerWithKeySchema,
  acceptInvitationSchema,
};
