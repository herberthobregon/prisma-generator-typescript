import "dotenv/config";

import { DMMF } from "@prisma/generator-helper";
import { Pool } from "pg";

export function getHeader() {
	return `
import { Pool } from "pg";
const client = new Pool({
	connectionString: process.env.DATABASE_URL!,
});

export async function connect() {
	await client.connect();
} 
`;
}
export function generateTableNamespaces(models: DMMF.Model[]) {
	return models
		.map(model => {
			const modelName = model.name;
			const primaryKeyFields = model.fields.filter(field => field.isId).map(field => field.name);
			const primaryKeyType = primaryKeyFields.length ? `Pick<${modelName}, "${primaryKeyFields.join('" | "')}">` : "never";

			return `
type ${modelName}PK = ${primaryKeyType};
type ${modelName}OrderByWithRelationInput = {
    [P in keyof ${modelName}]?: "asc" | "desc";
};
type ${modelName}Select = {
    [P in keyof ${modelName}]?: boolean;
};
type ${modelName}Include = {
    [P in keyof ${modelName}]?: boolean;
};
type ${modelName}GetPayload<S extends boolean | null | undefined | ${modelName}Select, U = keyof S> = S extends true
    ? ${modelName}
    : S extends ${modelName}Select
        ? {
            [P in keyof S & keyof ${modelName}]: P extends keyof ${modelName} ? ${modelName}[P] : never;
        }
        : never;
type ${modelName}WhereInput = {
    [P in keyof ${modelName}]?: ${modelName}[P] | null;
};
type findManyArgs = {
    select?: ${modelName}Select | null;
    include?: ${modelName}Include | null;
    where?: ${modelName}WhereInput;
    orderBy?: ${modelName}OrderByWithRelationInput;
    cursor?: ${modelName}PK;
    take?: number;
    skip?: number;
    distinct?: Array<keyof ${modelName}>;
};

export namespace ${modelName} {
    export function findUnique(args: { where: ${modelName}PK; select?: ${modelName}Select | null }) {
        const query = \`SELECT \${args.select ? Object.keys(args.select).join(", ") : "*"} FROM ${modelName} WHERE ${primaryKeyFields
			.map((field, i) => `${field} = ${i + 1}`)
			.join(" AND ")} LIMIT 1\`;
        return PG.$rawQuery(query, Object.values(args.where));
    }

    export function findMany(args: findManyArgs) {
        const where = args.where
            ? "WHERE " +
              Object.entries(args.where)
                  .map(([key, value], i) => \`\${key} = \${i + 1}\`)
                  .join(" AND ")
            : "";
        const orderBy = args.orderBy
            ? "ORDER BY " +
              Object.entries(args.orderBy)
                  .map(([key, value]) => \`\${key} \${value}\`)
                  .join(", ")
            : "";
        const query = \`SELECT \${args.select ? Object.keys(args.select).join(", ") : "*"} FROM ${modelName} \${where} \${orderBy} LIMIT \${args.take || "ALL"} OFFSET \${args.skip || 0}\`;
        return PG.$rawQuery(query, args.where ? Object.values(args.where) : []);
    }

    export function create(data: ${modelName}) {
        const keys = Object.keys(data);
        const values = keys.map((_, i) => \`\${i + 1}\`).join(", ");
        const query = \`INSERT INTO ${modelName} (\${keys.join(", ")}) VALUES (\${values}) RETURNING *\`;
        return PG.$rawQuery(query, Object.values(data));
    }

    export function update(args: { where: ${modelName}PK; data: Partial<${modelName}> }) {
        const dataKeys = Object.keys(args.data);
        const dataClause = dataKeys.map((key, i) => \`\${key} = \${i + 1}\`).join(", ");
        const whereClause = Object.keys(args.where)
            .map((key, i) => \`\${key} = \${i + 1 + dataKeys.length}\`)
            .join(" AND ");
        const query = \`UPDATE ${modelName} SET \${dataClause} WHERE \${whereClause} RETURNING *\`;
        return PG.$rawQuery(query, [...Object.values(args.data), ...Object.values(args.where)]);
    }

    export function delete(args: { where: ${modelName}PK }) {
        const whereClause = Object.keys(args.where)
            .map((key, i) => \`\${key} = \${i + 1}\`)
            .join(" AND ");
        const query = \`DELETE FROM ${modelName} WHERE \${whereClause} RETURNING *\`;
        return PG.$rawQuery(query, Object.values(args.where));
    }
}`;
		})
		.join("\n\n");
}

// ------------------------------------------------------------
// LIVE EXAMPLE
// ------------------------------------------------------------

const client = new Pool({
	connectionString: process.env.DATABASE_URL!
});

export async function connect() {
	await client.connect();
}

/* 
model users {
    id        Int      @id @default(autoincrement())
    created_at DateTime @default(now())
    updated_at DateTime @default(now())
    name      String
    last_name String?
    email     String   @unique
    password  String

    psm_posts posts[]

    @@index([created_at])
}

model posts {
    id       Int      @id @default(autoincrement())
    text    String
    user_id Int

    psm_user users @relation(fields: [user_id], references: [id])
}
*/
interface users {
	// PK
	id: number;
	// have default value in the database = now()
	created_at: Date;
	// have default value in the database = now()
	updated_at: Date;
	name: string;
	last_name?: string;
	// Unique
	email: string;
	password: string;

	psm_posts: posts[];
}

interface posts {
	id: number;
	text: string;
	user_id: number;

	psm_user: users;
}

const userJoinFields = new Set(["psm_posts"]);
type usersSelect = {
	[P in keyof users]?: boolean;
};
type usersOrderBy = {
	[P in keyof Pick<users, "id" | "created_at" | "email">]?: "asc" | "desc";
};
type usersWhere = {
	[P in keyof users]?: users[P] | null;
};
type userWhereUnique = {
	[P in keyof Pick<users, "id" | "email">]?: users[P] | null;
};

type usersGetPayload<S extends usersSelect | null | undefined> = S extends usersSelect
	? {
			[P in keyof S as S[P] extends true ? P : never]: P extends keyof users ? users[P] : never;
		}
	: users;

export namespace users {
	export async function findUnique<T extends usersSelect | null>(args: { where: userWhereUnique; select?: T | null; orderBy?: usersOrderBy }): Promise<usersGetPayload<T>> {
		// Procesar campos seleccionados
		let selectedFields = "*";
		let joins: string[] = [];
		if (args.select) {
			let keys = Object.keys(args.select);
			if (keys.length > 0) {
				let select: string[] = [];
				keys.forEach(field => {
					if (userJoinFields.has(field)) {
						joins.push(field); // Añadir a las relaciones que se deben unir
						return; // No se incluye directamente en la selección
					}
					select.push(field);
				});
				selectedFields = select.join(",");
			}
		}

		// Generar cláusula WHERE
		const whereClause = Object.keys(args.where)
			.map((field, i) => `${field} = $${i + 1}`)
			.join(" AND ");

		// Query final
		const query = `
                SELECT ${selectedFields}
                FROM users
                WHERE ${whereClause}
                LIMIT 1;
            `;

		// Ejecutar consulta
		let res = await client.query(query, Object.values(args.where));

		// Procesar resultados si incluye relaciones
		if (joins.length > 0 && res.rows.length > 0) {
			const row = res.rows[0];

			// Manejar psm_posts si está incluido
			if (args.select?.psm_posts) {
				const postsRes = await client.query(`SELECT * FROM posts WHERE user_id = $1`, [row.id]);
				row.psm_posts = postsRes.rows;
			}

			return row as usersGetPayload<T>;
		}

		return res.rows[0] as usersGetPayload<T>;
	}
}

// Test code
let rsp = await users.findUnique({ where: { id: 1 }, select: { id: true, name: true, email: true } });

// type usersInclude = {
// 	[P in keyof users]?: boolean;
// };

// type usersGetPayload<S extends boolean | null | undefined | usersSelect, U = keyof S> = S extends true
// 	? users
// 	: S extends usersSelect
// 		? {
// 				[P in TrueKeys<S>]: P extends keyof users ? users[P] : never;
// 			}
// 		: never;

// type usersWhereInput = {
//     [P in keyof users]?: users[P] | null;
// }
// type findManyArgs = {
// 	select?: usersSelect | null;
// 	include?: //
// 	where?: //
// 	orderBy?: //
// 	cursor?: //
// 	take?: number;
// 	skip?: number;
// 	distinct?: //
// };
