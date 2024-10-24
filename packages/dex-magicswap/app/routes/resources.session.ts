import type { ActionFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { z } from "zod";

import { SESSION_KEY_ADDRESS, commitSession, getSession } from "~/sessions";

const putSchema = z.object({
  address: z.string(),
});

export const action = async ({ request }: ActionFunctionArgs) => {
  const session = await getSession(request.headers.get("Cookie"));
  switch (request.method) {
    case "PUT": {
      try {
        const { address } = putSchema.parse(
          Object.fromEntries(await request.formData()),
        );
        session.set(SESSION_KEY_ADDRESS, address);
      } catch (err) {
        console.error("Error parsing session payload:", err);
        return json({ message: "Missing address" }, 400);
      }
      break;
    }
    case "DELETE":
      session.unset(SESSION_KEY_ADDRESS);
      break;
    default:
      return json({ message: "Method not allowed" }, 405);
  }

  return json(
    {},
    {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    },
  );
};
