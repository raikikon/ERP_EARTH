import axios from "axios";

export async function uploadBase64Image(base64Image) {
  if (!base64Image) return "";
  if (base64Image.startsWith("http://") || base64Image.startsWith("https://")) return base64Image;
  const key = process.env.IMAGEBB_API_KEY;
  const host = process.env.IMAGE_HOST_URL || "https://api.imgbb.com/1/upload";
  if (!key) throw new Error("IMAGEBB_API_KEY is missing");
  const image = base64Image.includes(",") ? base64Image.split(",").pop() : base64Image;
  const form = new URLSearchParams();
  form.append("key", key);
  form.append("image", image);
  const { data } = await axios.post(host, form);
  return data?.data?.url || data?.data?.display_url || "";
}
