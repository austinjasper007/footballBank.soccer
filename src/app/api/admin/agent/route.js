import { NextResponse } from "next/server";
import { getAgentInfo, updateAgentInfo } from "@/actions/adminActions";
import { requireRole } from "@/lib/oauth";

function authorizationResponse(error) {
  if (error.message === "Authentication required") {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }
  if (error.message === "Role admin required") {
    return NextResponse.json({ error: "Administrator access required" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  try {
    await requireRole("admin");
    const agentInfo = await getAgentInfo();
    return NextResponse.json(agentInfo);
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error("Error fetching agent info:", error);
    return NextResponse.json(
      { error: "Failed to fetch agent information" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    await requireRole("admin");
    const formData = await request.formData();
    const updatedAgent = await updateAgentInfo(formData);
    return NextResponse.json(updatedAgent);
  } catch (error) {
    const response = authorizationResponse(error);
    if (response) return response;
    console.error("Error updating agent info:", error);
    return NextResponse.json(
      { error: "Failed to update agent information" },
      { status: 500 }
    );
  }
}
