import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = body;

    if (!url) {
      return NextResponse.json(
        { error: "Missing url" },
        { status: 400 }
      );
    }

    let res;
    try {
      res = await fetch(url, { redirect: "follow" });
    } catch (fetchErr) {
      console.error("FETCH FAILED:", fetchErr);
      return NextResponse.json(
        { error: "Failed to fetch website" },
        { status: 500 }
      );
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: `Website returned ${res.status}` },
        { status: 500 }
      );
    }

    const html = await res.text();

    // minimal safe extraction
    const titleMatch = html.match(/<title>(.*?)<\/title>/i);

    return NextResponse.json({
      success: true,
      data: {
        title: titleMatch?.[1] || null,
      },
    });
  } catch (err: any) {
    console.error("EXTRACT WEBSITE ERROR:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
