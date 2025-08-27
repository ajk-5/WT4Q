export async function GET(
  _req: Request,
  context: { params: Promise<{ indexnowApi: string }> }
) {
  const apiKey = process.env.INDEXNOW_API ?? "e37c5166e3b64c0a97d1f5c7a97e4afc";
  const { indexnowApi } = await context.params;

  if (indexnowApi !== apiKey) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(apiKey, {
    headers: { "Content-Type": "text/plain" },
  });
}
