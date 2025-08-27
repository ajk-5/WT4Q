export function GET(
  _req: Request,
  { params }: { params: { indexnowApi: string } }
) {
  const apiKey = process.env.INDEXNOW_API ?? "e37c5166e3b64c0a97d1f5c7a97e4afc";
  if (params.indexnowApi !== apiKey) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(apiKey, {
    headers: { "Content-Type": "text/plain" },
  });
}
