import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-session";
import { createOwner, getOwners } from "@/data/ownersStore";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const owners = getOwners().map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    username: o.username,
    plainPassword: o.plainPassword,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return NextResponse.json({ owners });
}

export async function POST(request: NextRequest) {
  if (!(await isAdminAuthenticated(request))) {
    return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    email?: string;
    username?: string;
    password?: string;
  };

  try {
    const owner = createOwner({
      name: body.name ?? "",
      email: body.email ?? "",
      username: body.username ?? "",
      password: body.password ?? "",
    });
    return NextResponse.json({
      ok: true,
      owner: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        username: owner.username,
        plainPassword: owner.plainPassword,
        status: owner.status,
        createdAt: owner.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to create owner." },
      { status: 400 },
    );
  }
}
