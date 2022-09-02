import { json } from "@remix-run/node";
export async function loader({ request }) {
  const url = new URL(request.url);
  console.log(111);

  return json({ any: "thing" });
}

export const action = async ({ request }) => {
  const formData = await request.json();
  console.log(222, request.url, formData);
  return json(formData);
};
