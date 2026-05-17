export default {
  async fetch() {

    const imageUrl =
      "https://img10.hotstar.com/image/upload/f_auto,q_90/sources/r1/cms/prod/4753/1778859124753-h";

    try {

      const response = await fetch(imageUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      });

      const contentType =
        response.headers.get("content-type") ||
        "image/jpeg";

      return new Response(response.body, {
        headers: {
          "Content-Type": contentType,
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=86400"
        }
      });

    } catch (e) {

      return new Response(
        "Error: " + e.toString(),
        { status: 500 }
      );
    }
  }
}