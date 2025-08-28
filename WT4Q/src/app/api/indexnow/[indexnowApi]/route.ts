export async function GET(
  _req: Request,
  context: { params: Promise<{ indexnowApi: string }> }
) {
  const apiKey = process.env.INDEXNOW_API ?? "bdb104bb52bb4139bcb509b70a5def73";
  const { indexnowApi } = await context.params;

  if (indexnowApi !== apiKey) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(apiKey, {
    headers: { "Content-Type": "text/plain" },
  });
}
