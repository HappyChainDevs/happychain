import { fetchTokens } from "~/api/tokens.server";

export const loader = async () => {
  try {
    await fetchTokens();
    return new Response("OK");
  } catch (err) {
    console.error("Healthcheck failed:", err);

    return new Response("ERROR", { status: 500 });
  }
};
