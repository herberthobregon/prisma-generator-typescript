import type { DMMF } from "@prisma/generator-helper";
import z from "zod";
import { ConfigSchema } from "./config.zod.js";

const SCALAR_TYPE_TO_ZOD: Record<string, (config: z.infer<typeof ConfigSchema>, field?: DMMF.Field) => string> = {
	String: () => "z.string()",
	Boolean: () => "z.boolean()",
	Int: () => "z.number().int()",
	Float: () => "z.number()",
	Json: (config, field) => {
		let zodType = "z.any()";
		if (field?.default == "{}") {
			zodType = "z.any()";
		}
		if (field?.default == "[]") {
			zodType = "z.array(z.any())";
		}
		return zodType;
	},
	DateTime: (config) => (config.dateType === "string" ? "z.string().datetime()" : "z.date()"),
	BigInt: () => "z.bigint()",
	Decimal: () => "z.number()",
	Bytes: () => "z.instanceof(Buffer)",
};

function getZodSchema(field: DMMF.Field, config: z.infer<typeof ConfigSchema>) {
	const zodTypeGetter = SCALAR_TYPE_TO_ZOD[field.type];
	let zodType = zodTypeGetter ? zodTypeGetter(config, field) : null;

	if (!zodType) {
		switch (field.kind) {
			case "enum":
				zodType = field.type;
				break;
			case "unsupported":
				zodType = "z.any()";
				break;
			default:
				// This should not happen for scalar or enum fields
				zodType = "z.any()";
		}
	}

	if (field.isList) {
		zodType = `z.array(${zodType})`;
	}

	if (!field.isRequired) {
		zodType += ".nullable()";
	}

	if (config.optionalNullables && !field.isRequired) {
		zodType += ".optional()";
	}

	return zodType;
}

export function getModelZod(
	config: z.infer<typeof ConfigSchema>,
	modelData: DMMF.Model,
	modelNameMap: Map<string, string>,
	_enumNameMap: Map<string, string>,
	typeNameMap: Map<string, string>,
): string {
	const modelName = modelNameMap.get(modelData.name) ?? typeNameMap.get(modelData.name);
	if (!modelName) {
		throw new Error(`Could not find name for model ${modelData.name}`);
	}

	const fields = modelData.fields
		.filter((field) => field.kind !== "object") // Exclude relations
		.map((field) => {
			const zodSchema = getZodSchema(field, config);
			return `  ${field.name}: ${zodSchema}`;
		})
		.join(",\n");

	return `export const ${modelName} = z.object({\n${fields}\n});`;
}

export function getEnumZod(_config: z.infer<typeof ConfigSchema>, enumData: DMMF.DatamodelEnum, enumNameMap: Map<string, string>): string {
	const enumName = enumNameMap.get(enumData.name);
	if (!enumName) {
		throw new Error(`Unknown enum name: ${enumData.name}`);
	}
	const enumValues = enumData.values.map(({ name }) => `"${name}"`);
	return `export const ${enumName} = z.enum([${enumValues.join(", ")}]);`;
}
