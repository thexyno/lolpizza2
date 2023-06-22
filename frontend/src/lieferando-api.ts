export async function getRestaurantInfo() {
  const primarySlug = window.location.pathname.split("/").pop();

  const sessionId = JSON.parse(decodeURIComponent(document.cookie.split(";").find((cookie) => cookie.includes("cwSession"))!.split("=")[1]))["id"] as string;
  const restaurantInfo = await fetch(`https://cw-api.takeaway.com/api/v33/restaurant?slug=${primarySlug}`, {
    headers: {
      "X-Requested-With": "XMLHttpRequest",
      "X-Country-Code": "de",
      "X-Language-Code": "de",
      "X-Session-Id": sessionId,
    }
  }).then((res) => res.json()) as { restaurantId: string, brand: { name: string, slogan: string, description: string[] } & { [name: string]: string } } & { [name: string]: unknown };
  return restaurantInfo;

}
