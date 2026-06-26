"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  userId: string;
  userEmail: string;
}

export function DeleteUserButton({ userId, userEmail }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(`Delete user "${userEmail}"? This will also remove their band or venue profile and all associated data.`)) return;
    setLoading(true);
    await fetch(`/api/admin/users/${userId}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button onClick={handleDelete} disabled={loading} className="text-sm text-red-500 hover:text-red-700 transition-colors">
      {loading ? "Deleting…" : "Delete"}
    </button>
  );
}
