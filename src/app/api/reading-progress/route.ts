// src/app/api/reading-progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, AuthenticatedRequest } from '@/server/middleware/auth';
import { db } from '@/server/config/db';
import { sql } from 'kysely';

async function handler(req: AuthenticatedRequest) {
	if (req.method === 'POST') {
		try {
			const { topic_id, lesson_id, latest_read_paragraph } =
				await req.json();

			// Upsert reading progress
			await db
				.insertInto('reading_progress')
				.values({
					user_id: req.user.id,
					topic_id,
					lesson_id,
					latest_read_paragraph,
					last_read_paragraph: latest_read_paragraph,
				})
				.onConflict((oc) =>
					oc
						.columns(['user_id', 'topic_id', 'lesson_id'])
						.doUpdateSet({
							latest_read_paragraph,
							last_read_paragraph: sql`reading_progress.latest_read_paragraph`,
							updated_at: new Date(),
						})
				)
				.execute();

			return NextResponse.json({ success: true });
		} catch (error) {
			console.error('Failed to update reading progress:', error);
			return NextResponse.json(
				{ error: 'Failed to update reading progress' },
				{ status: 500 }
			);
		}
	}

	if (req.method === 'GET') {
		try {
			// Fix: Get query parameters correctly from URL
			const url = new URL(req.url);
			const topic_id = url.searchParams.get('topic_id');
			const lesson_id = url.searchParams.get('lesson_id');

			if (!topic_id || !lesson_id) {
				return NextResponse.json(
					{ error: 'Missing topic_id or lesson_id' },
					{ status: 400 }
				);
			}

			// Debug log
			console.log('Fetching progress for:', {
				user_id: req.user.id,
				topic_id,
				lesson_id,
			});

			const progress = await db
				.selectFrom('reading_progress')
				.where('user_id', '=', req.user.id)
				.where('topic_id', '=', topic_id)
				.where('lesson_id', '=', lesson_id)
				.select([
					'latest_read_paragraph',
					'last_read_paragraph',
					'updated_at',
				])
				.executeTakeFirst();

			// Debug log
			console.log('Found progress:', progress);

			return NextResponse.json(
				progress || {
					latest_read_paragraph: 0,
					last_read_paragraph: 0,
					updated_at: new Date(),
				}
			);
		} catch (error) {
			console.error('Failed to fetch reading progress:', error);
			return NextResponse.json(
				{ error: 'Failed to fetch reading progress' },
				{ status: 500 }
			);
		}
	}

	return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function POST(req: NextRequest) {
	return withAuth(handler, req);
}

export async function GET(req: NextRequest) {
	return withAuth(handler, req);
}
