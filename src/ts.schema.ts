import type { DMMF } from "@prisma/generator-helper";
import z from "zod";
import { ConfigSchema } from "./config.zod.js";

export const JSON_REGEX = /^\s*!?\[(.*?)\]/m;
export const JSDOC_REGEX = /@type\s*\{\s*(.*?)\s*\}[$\s]/m;
export const LITERAL_REGEX = /^\s*!/m;

const SCALAR_TYPE_GETTERS: Record<string, (config: z.infer<typeof ConfigSchema>) => string> = {
	String: () => "string",
	Boolean: () => "boolean",
	Int: () => "number",
	Float: () => "number",
	Json: () => "JsonValue",
	DateTime: (config) => (config.dateType.includes("|") ? `(${config.dateType})` : config.dateType),
	BigInt: (config) => (config.bigIntType.includes("|") ? `(${config.bigIntType})` : config.bigIntType),
	Decimal: (config) => (config.decimalType.includes("|") ? `(${config.decimalType})` : config.decimalType),
	Bytes: (config) => (config.bytesType.includes("|") ? `(${config.bytesType})` : config.bytesType),
};

// Since we want the output to have zero dependencies, define custom types which are compatible
// with the actual Prisma types. If users need the real Prisma types, they can cast to them.
export const CUSTOM_TYPES = {
	BufferObject: 'type BufferObject = { type: "Buffer"; data: number[] };',
	Decimal: "type Decimal = { valueOf(): string };",
	JsonValue: "type JsonValue = string | number | boolean | { [key in string]?: JsonValue } | Array<JsonValue> | null;",
};

function createType(description: string | undefined, config: z.infer<typeof ConfigSchema>) {
	const jsdoc = description?.match(JSDOC_REGEX)?.[1];
	if (jsdoc) {
		return `(${jsdoc})`;
	}
	const type = description?.match(JSON_REGEX)?.[1];
	const isLiteral = !!description?.match(LITERAL_REGEX);

	// Literal types, just return the type
	if (isLiteral || !config.namespaceType) {
		return `(${type})`;
	}

	// Defaults to unknown always, config.allowAny is handled before this function
	if (!type) {
		return "unknown";
	}

	// If we should use a type as global type map
	if (config.useType) {
		return `${config.namespace}.${config.useType}[${JSON.stringify(type)}]`;
	}

	// Just return the type
	return `${config.namespaceType}.${type}`;
}

function getComment(comment: string | undefined) {
	if (!comment) return "";
	if (comment.includes("\n")) {
		return `/**\n * ${comment.replace(/\n/g, "\n * ")}\n */\n`;
	}
	return `/** ${comment} */\n`;
}

export function getModelTs(
	config: z.infer<typeof ConfigSchema>,
	modelData: DMMF.Model,
	modelNameMap: Map<string, string>,
	enumNameMap: Map<string, string>,
	typeNameMap: Map<string, string>,
	usedCustomTypes: Set<keyof typeof CUSTOM_TYPES>,
): string {
	const fields = modelData.fields
		.map((field) => {
			const getDefinition = (resolvedType: string, optional = false, isList = field.isList) =>
				"  " +
				// `// ${JSON.stringify(field.relationFromFields)} - ${JSON.stringify(field.relationToFields)} \n  ` +
				getComment(field.documentation) +
				`${field.name}${optional || (!field.isRequired && config.optionalNullables) ? "?" : ""}: ` +
				`${resolvedType}${isList ? "[]" : ""}${!field.isRequired ? " | null" : ""};`;

			switch (field.kind) {
				case "scalar": {
					const typeGetter = SCALAR_TYPE_GETTERS[field.type];
					if (!typeGetter) {
						throw new Error(`Unknown scalar type: ${field.type}`);
					}
					const resolvedType = typeGetter(config);
					if (resolvedType in CUSTOM_TYPES) {
						usedCustomTypes.add(resolvedType as keyof typeof CUSTOM_TYPES);
					}
					// check if has relation
					const relationField = modelData.fields.find((f) => f.relationFromFields?.[0] == field.name);
					if (relationField) {
						const modelName = modelNameMap.get(relationField.type);
						const typeName = typeNameMap.get(relationField.type);
						if (typeName) {
							return getDefinition(typeName);
						} else if (modelName) {
							return getDefinition(`${modelName}['${relationField.relationToFields?.[0]}']`);
						} else {
							throw new Error(`Unknown model name: ${relationField.type}`);
						}
					}
					const match = field.documentation?.match(JSON_REGEX) || field.documentation?.match(JSDOC_REGEX);
					if (match) {
						const newType = createType(field.documentation, config);
						return getDefinition(newType, false, false);
					}

					return getDefinition(resolvedType);
				}
				case "object": {
					const modelName = modelNameMap.get(field.type);
					const typeName = typeNameMap.get(field.type);
					if (typeName) {
						return getDefinition(typeName); // Type relations are never optional or omitted
					} else if (modelName) {
						return config.omitRelations ? null : getDefinition(modelName, config.optionalRelations);
					} else {
						throw new Error(`Unknown model name: ${field.type}`);
					}
				}
				case "enum": {
					const enumName = enumNameMap.get(field.type);
					if (!enumName) {
						throw new Error(`Unknown enum name: ${field.type}`);
					}
					return getDefinition(enumName);
				}
				case "unsupported":
					return getDefinition("any");
				default:
					throw new Error(`Unknown field kind: ${field.kind}`);
			}
		})
		.filter((f) => f !== null)
		.join("\n");

	const name = modelNameMap.get(modelData.name) ?? typeNameMap.get(modelData.name);

	switch (config.modelType) {
		case "interface":
			return `export interface ${name} {\n${fields}\n}`;
		case "type":
			return `export type ${name} = {\n${fields}\n};`;
		default:
			throw new Error(`Unknown modelType: ${config.modelType}`);
	}
}

export function getEnumTs(config: z.infer<typeof ConfigSchema>, enumData: DMMF.DatamodelEnum, enumNameMap: Map<string, string>): string {
	switch (config.enumType) {
		case "enum": {
			const enumValues = enumData.values.map(({ name }) => `  ${name} = "${name}"`).join(",\n");
			return `export enum ${enumNameMap.get(enumData.name)} {\n${enumValues}\n}`;
		}
		case "stringUnion": {
			const enumValues = enumData.values.map(({ name }) => `"${name}"`).join(" | ");
			return `export type ${enumNameMap.get(enumData.name)} = ${enumValues};`;
		}
		case "object": {
			const enumValues = enumData.values.map(({ name }) => `  ${name}: "${name}"`).join(",\n");
			const enumName = enumNameMap.get(enumData.name);
			return `export const ${enumName} = {\n${enumValues}\n} as const;\n\nexport type ${enumName} = (typeof ${enumName})[keyof typeof ${enumName}];`;
		}
		default:
			throw new Error(`Unknown enumType: ${config.enumType}`);
	}
}
