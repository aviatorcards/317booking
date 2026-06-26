import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DeleteUserButton } from "./DeleteUserButton";

export default async function AdminUsersPage() {
  const session = await getSession();
  if (!session || session.user.role !== "ADMIN") redirect("/login");

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      band: { select: { name: true } },
      venue: { select: { name: true } },
    },
  });

  const roleBadge = (role: string) => {
    if (role === "ADMIN") return "bg-purple-100 text-purple-800";
    if (role === "VENUE") return "bg-blue-100 text-blue-800";
    return "bg-green-100 text-green-800";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-8">Users ({users.length})</h1>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-3 pr-4 font-medium">Email</th>
              <th className="pb-3 pr-4 font-medium">Role</th>
              <th className="pb-3 pr-4 font-medium">Name</th>
              <th className="pb-3 pr-4 font-medium">Joined</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => {
              const displayName = user.band?.name ?? user.venue?.name ?? "—";
              const isSelf = user.id === session.user.id;

              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="py-3 pr-4 font-medium">{user.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${roleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-gray-600">{displayName}</td>
                  <td className="py-3 pr-4 text-gray-500">
                    {new Date(user.createdAt).toLocaleDateString("en-US", {
                      month: "short", day: "numeric", year: "numeric",
                    })}
                  </td>
                  <td className="py-3 text-right">
                    {!isSelf && user.role !== "ADMIN" && (
                      <DeleteUserButton userId={user.id} userEmail={user.email} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {users.length === 0 && (
          <p className="text-center text-gray-400 py-12">No users yet.</p>
        )}
      </div>
    </div>
  );
}
