import type { D1Database } from '@cloudflare/workers-types';
import { Hono } from 'hono';
import { D1QB } from 'workers-qb';

type Env = {
	DB: D1Database;
	DATABASE_ID: string;
	DATABASE_NAME: string;
}

const app = new Hono<{ Bindings: Env }>();


interface CreateUserBody {
	username: string;
	email: string;
	groupId: string;
}

type ResponseUserBody = {
	id: string;
	groupId: string;
	groupname: string;
} & CreateUserBody;

app.post('/api/users', async c => {
	try {
		const body = await c.req.json<CreateUserBody>();

		const qb = new D1QB(c.env.DB);
		const inserted = await qb.insert({
			tableName: 'users',
			data: {
				username: body.username,
				email: body.email,
				group_id: body.groupId
			}
		}).execute();
		return c.json(inserted);
	} catch (e) {
		console.error(e);
		throw e;
	}
});

app.get('/api/users/:id', async c => {
	console.log('c', c);

	const { id } = c.req.param();
	const qb = new D1QB(c.env.DB);
	const fetched = await qb.fetchOne({
		tableName: 'users',
		join: {
			table: 'groups',
			on: 'users.group_id = groups.id',
			type: 'LEFT'
		},
		fields: 'users.id, users.username, users.email, groups.id as groupId, groups.groupname',
		where: {
			conditions: 'users.id = ?1',
			params: [id]
		}
	}).execute();

	return c.json<ResponseUserBody>(fetched.results);
});

app.delete('/api/users/:id', async c => {
	const { id } = c.req.param();
	const qb = new D1QB(c.env.DB);
	const deleted = await qb.delete({
		tableName: 'users',
		where: {
			conditions: 'users.id = ?1',
			params: [id]
		}
	}).execute();

	return c.json(deleted);
});


export default app;
