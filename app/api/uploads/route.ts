export const runtime = "nodejs";

function cloudinarySignature(params: Record<string, string>, secret: string) {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.subtle.digest("SHA-1", new TextEncoder().encode(`${payload}${secret}`))
    .then((hash) => Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""));
}

export async function POST(request: Request) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return Response.json({ error: "Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY e CLOUDINARY_API_SECRET na Vercel." }, { status: 500 });
  }

  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Selecione uma imagem valida." }, { status: 400 });
  }

  if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) {
    return Response.json({ error: "Envie uma imagem JPG, PNG ou WEBP de ate 5 MB." }, { status: 400 });
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const folder = "sistema-banheiras-amostras";
  const signature = await cloudinarySignature({ folder, timestamp }, apiSecret);
  const upload = new FormData();
  upload.append("file", file);
  upload.append("folder", folder);
  upload.append("timestamp", timestamp);
  upload.append("api_key", apiKey);
  upload.append("signature", signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: upload,
  });
  const result = await response.json() as { secure_url?: string; original_filename?: string; error?: { message?: string } };

  if (!response.ok || !result.secure_url) {
    return Response.json({ error: result.error?.message || "Nao foi possivel enviar a imagem para o Cloudinary." }, { status: 502 });
  }

  return Response.json({ url: result.secure_url, name: result.original_filename || file.name }, { status: 201 });
}
