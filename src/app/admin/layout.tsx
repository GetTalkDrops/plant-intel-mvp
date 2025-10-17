import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  DollarSign,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/sign-in");
  }

  // Check if user has admin role
  const isAdmin = user.publicMetadata?.role === "admin";

  if (!isAdmin) {
    redirect("/");
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-xl font-bold">Plant Intel Admin</h1>
            <p className="text-sm text-gray-500 mt-1">
              {user.emailAddresses[0]?.emailAddress}
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Dashboard</span>
            </Link>

            <Link
              href="/admin/customers"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <Users className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Customers</span>
            </Link>

            <Link
              href="/admin/reviews"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ClipboardCheck className="h-5 w-5 text-gray-600" />
              <span className="font-medium">Reviews</span>
            </Link>

            <Link
              href="/admin/roi"
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <DollarSign className="h-5 w-5 text-gray-600" />
              <span className="font-medium">ROI Tracking</span>
            </Link>
          </nav>

          {/* User Button */}
          <div className="p-4 border-t border-gray-200">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
