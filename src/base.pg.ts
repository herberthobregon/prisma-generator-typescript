export function getNamespacePG(str: string): string {
	return `export namespace PG {
    // PG.$rawQuery
    export function $rawQuery(query: string, values: any[] = []) {
        return client.query(query, values)
    }

    ${str}
}`;
}

export function getPGClienteConnection(envDB?: string): string {
	return `
import "dotenv/config";
import { Pool } from "pg";

// With connection string
const client = new Pool({
    connectionString: process.env.${envDB || "DATABASE_URL"}!
});

export async function connect() {
    await client.connect();
}
    
`;
}
