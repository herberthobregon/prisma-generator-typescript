import { z } from "zod";

export const Gender = z.enum(["Male", "Female", "Other"]);

export const DataTest = z.enum(["Apple", "Banana", "Orange", "Pear"]);

export const Person = z.object({
  id: z.number().int(),
  name: z.string(),
  age: z.number().int(),
  email: z.string().nullable(),
  gender: Gender,
  addressId: z.number().int()
});

export const Address = z.object({
  id: z.number().int(),
  streetNumber: z.number().int(),
  streetName: z.string(),
  city: z.string(),
  isBilling: z.boolean()
});

export const Data = z.object({
  id: z.string(),
  stringField: z.string(),
  booleanField: z.boolean(),
  intField: z.number().int(),
  bigIntField: z.bigint(),
  floatField: z.number(),
  decimalField: z.number(),
  dateField: z.date(),
  jsonField: z.any(),
  bytesField: z.instanceof(Buffer),
  enumField: DataTest,
  optionalStringField: z.string().nullable(),
  optionalBooleanField: z.boolean().nullable(),
  optionalIntField: z.number().int().nullable(),
  optionalBigIntField: z.bigint().nullable(),
  optionalFloatField: z.number().nullable(),
  optionalDecimalField: z.number().nullable(),
  optionalDateField: z.date().nullable(),
  optionalJsonField: z.any().nullable(),
  optionalBytesField: z.instanceof(Buffer).nullable(),
  optionalEnumField: DataTest.nullable(),
  stringArrayField: z.array(z.string()),
  booleanArrayField: z.array(z.boolean()),
  intArrayField: z.array(z.number().int()),
  bigIntArrayField: z.array(z.bigint()),
  floatArrayField: z.array(z.number()),
  decimalArrayField: z.array(z.number()),
  dateArrayField: z.array(z.date()),
  jsonArrayField: z.array(z.any()),
  bytesArrayField: z.array(z.instanceof(Buffer)),
  enumArrayField: z.array(DataTest),
  personId: z.number().int()
});
