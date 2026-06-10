export function jsonHeaders(headers: Record<string, string> = {}, body?: unknown): HeadersInit {
  const result: Record<string, string> = { ...headers };
  if (body !== undefined && !hasHeader(result, "content-type")) {
    result["content-type"] = "application/json";
  }
  if (!hasHeader(result, "accept")) {
    result.accept = "application/json";
  }
  return result;
}

function hasHeader(headers: Record<string, string>, name: string): boolean {
  return Object.keys(headers).some((key) => key.toLowerCase() === name.toLowerCase());
}

export function bodyToFetchBody(body: unknown): BodyInit | undefined {
  if (body === undefined || body === null) return undefined;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

export async function readResponseData(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function headerObject(headers: Headers): Record<string, string> {
  const output: Record<string, string> = {};
  headers.forEach((value, key) => {
    output[key] = value;
  });
  return output;
}
