// Empty endpoint to prevent Chrome DevTools 404 errors
export async function GET() {
	return new Response('{}', {
		headers: {
			'Content-Type': 'application/json'
		}
	});
}
