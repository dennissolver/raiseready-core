import { NextResponse } from "next/server";

const VERCEL_API = "https://api.vercel.com/v10/projects";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectName } = body;

    if (!projectName) {
      return NextResponse.json(
        { error: "Missing projectName" },
        { status: 400 }
      );
    }

    const res = await fetch(VERCEL_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.VERCEL_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: projectName,
        framework: "nextjs",
        // ❌ DO NOT add autoAssignCustomDomains
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("VERCEL ERROR:", data);
      return NextResponse.json(
        { error: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      project: data,
    });
  } catch (err: any) {
    console.error("CREATE VERCEL PROJECT FAILED:", err);
    return NextResponse.json(
      { error: err.message || "Unknown error" },
      { status: 500 }
    );
  }
}
