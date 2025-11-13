type DateType = "Date" | "string" | "number";
export interface Config {
	enumPrefix: string;
	enumSuffix: string;
	modelPrefix: string;
	modelSuffix: string;
	typePrefix: string;
	typeSuffix: string;
	namespace?: string;
	namespaceType?: string;
	useType?: string;
	headerComment: string;
	modelType: "interface" | "type";
	enumType: "stringUnion" | "enum" | "object";
	dateType: DateType | `${DateType} | ${DateType}`;
	bigIntType: "bigint" | "string" | "number";
	decimalType: "Decimal" | "string" | "number";
	bytesType: "Buffer" | "BufferObject" | "string" | "number[]";
	prefixCode?: string;
	suffixCode?: string;
	zodOutput?: string;
	optionalRelations: boolean;
	omitRelations: boolean;
	optionalNullables: boolean;
	prettier: boolean;
}
